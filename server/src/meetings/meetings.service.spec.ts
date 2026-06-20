import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MeetingsService } from './meetings.service';
import { Meeting } from './entities/meeting.entity';
import { MeetingStatus } from './enums/meeting-status.enum';
import { TranscriptionsService } from '../transcriptions/transcriptions.service';
import { SummariesService } from '../summaries/summaries.service';
import { BlobStorageService } from '../storage/blob-storage.service';
import { ExtractionService } from '../extraction/extraction.service';

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'audio',
    originalname: 'meeting.mp3',
    encoding: '7bit',
    mimetype: 'audio/mpeg',
    buffer: Buffer.from('fake-audio'),
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
    ...overrides,
  };
}

function buildMeeting(overrides: Partial<Meeting> = {}): Meeting {
  const m = new Meeting();
  m.id = 'uuid-1234';
  m.originalFileName = 'meeting.mp3';
  m.title = 'meeting';
  m.storedFileName = 'stored-uuid.mp3';
  m.status = MeetingStatus.PENDING;
  m.errorMessage = null;
  m.transcription = null;
  m.summary = null;
  m.createdAt = new Date('2024-01-01');
  m.updatedAt = new Date('2024-01-01');
  return Object.assign(m, overrides);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MeetingsService', () => {
  let service: MeetingsService;
  let meetingRepo: jest.Mocked<Repository<Meeting>>;
  let transcriptionsService: jest.Mocked<TranscriptionsService>;
  let summariesService: jest.Mocked<SummariesService>;
  let blobStorageService: jest.Mocked<BlobStorageService>;
  let extractionService: jest.Mocked<ExtractionService>;

  beforeEach(async () => {
    const mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SelectQueryBuilder<Meeting>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        {
          provide: getRepositoryToken(Meeting),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
          },
        },
        {
          provide: TranscriptionsService,
          useValue: {
            toResponse: jest.fn(),
            deleteByMeetingId: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SummariesService,
          useValue: {
            toResponse: jest.fn(),
            deleteByMeetingId: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: BlobStorageService,
          useValue: {
            uploadBuffer: jest.fn().mockResolvedValue(undefined),
            getReadSasUrl: jest.fn().mockReturnValue('https://example.com/sas'),
            deleteBlob: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ExtractionService,
          useValue: {
            addExtractJob: jest.fn().mockResolvedValue('job-id-123'),
          },
        },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    meetingRepo = module.get(getRepositoryToken(Meeting));
    transcriptionsService = module.get(TranscriptionsService);
    summariesService = module.get(SummariesService);
    blobStorageService = module.get(BlobStorageService);
    extractionService = module.get(ExtractionService);
  });

  // ── createFromUpload ──────────────────────────────────────────────────────

  describe('createFromUpload', () => {
    it('should throw BadRequestException when no file is provided', async () => {
      await expect(service.createFromUpload(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unsupported MIME type', async () => {
      const file = buildFile({ mimetype: 'text/plain' });
      await expect(service.createFromUpload(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createFromUpload(file)).rejects.toThrow(
        'Unsupported file type',
      );
    });

    it('should throw BadRequestException when file exceeds 25 MB', async () => {
      const file = buildFile({ size: 26 * 1024 * 1024 });
      await expect(service.createFromUpload(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createFromUpload(file)).rejects.toThrow(
        'File too large',
      );
    });

    it('should upload blob, save meeting and queue extraction job for valid file', async () => {
      const file = buildFile();
      const savedMeeting = buildMeeting();
      meetingRepo.create.mockReturnValue(savedMeeting);
      meetingRepo.save.mockResolvedValue(savedMeeting);

      const result = await service.createFromUpload(file);

      expect(blobStorageService.uploadBuffer).toHaveBeenCalledTimes(1);
      expect(meetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFileName: 'meeting.mp3',
          title: 'meeting',
          status: MeetingStatus.PENDING,
        }),
      );
      expect(meetingRepo.save).toHaveBeenCalledWith(savedMeeting);
      expect(extractionService.addExtractJob).toHaveBeenCalledWith(
        savedMeeting.id,
        savedMeeting.storedFileName,
      );
      expect(result.jobId).toBe('job-id-123');
      expect(result.id).toBe(savedMeeting.id);
    });

    it('should accept all allowed MIME types', async () => {
      const allowedTypes = [
        'audio/mpeg', 'audio/mp4', 'audio/wav',
        'audio/webm', 'audio/ogg', 'audio/x-m4a', 'video/mp4',
      ];
      const savedMeeting = buildMeeting();
      meetingRepo.create.mockReturnValue(savedMeeting);
      meetingRepo.save.mockResolvedValue(savedMeeting);

      for (const mimetype of allowedTypes) {
        const file = buildFile({ mimetype });
        await expect(service.createFromUpload(file)).resolves.toBeDefined();
      }
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a meeting response when found', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);

      const result = await service.findOne(meeting.id);

      expect(meetingRepo.findOne).toHaveBeenCalledWith({
        where: { id: meeting.id },
        relations: ['transcription', 'summary'],
      });
      expect(result.id).toBe(meeting.id);
    });

    it('should throw NotFoundException when meeting does not exist', async () => {
      meetingRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include audioUrl when blobStorageService.getReadSasUrl succeeds', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      blobStorageService.getReadSasUrl.mockReturnValue('https://example.com/sas');

      const result = await service.findOne(meeting.id);
      expect(result.audioUrl).toBe('https://example.com/sas');
    });

    it('should set audioUrl to undefined when SAS generation fails', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      blobStorageService.getReadSasUrl.mockImplementation(() => {
        throw new Error('SAS error');
      });

      const result = await service.findOne(meeting.id);
      expect(result.audioUrl).toBeUndefined();
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return an empty array when no meetings exist', async () => {
      const result = await service.findAll();
      expect(result).toEqual([]);
    });

    it('should return all meetings ordered by createdAt DESC', async () => {
      const meetings = [buildMeeting(), buildMeeting({ id: 'uuid-5678' })];
      const qb = meetingRepo.createQueryBuilder('meeting') as any;
      qb.getMany.mockResolvedValue(meetings);

      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });

    it('should apply WHERE clause when search term is provided', async () => {
      const qb = meetingRepo.createQueryBuilder() as any;
      qb.getMany.mockResolvedValue([]);

      await service.findAll('standup');
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ q: '%standup%' }),
      );
    });

    it('should trim search term before applying filter', async () => {
      const qb = meetingRepo.createQueryBuilder() as any;
      qb.getMany.mockResolvedValue([]);

      await service.findAll('  standup  ');
      expect(qb.where).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ q: '%standup%' }),
      );
    });

    it('should not apply WHERE clause for empty/blank search term', async () => {
      const qb = meetingRepo.createQueryBuilder() as any;
      qb.getMany.mockResolvedValue([]);

      await service.findAll('   ');
      expect(qb.where).not.toHaveBeenCalled();
    });
  });

  // ── deleteMeeting ─────────────────────────────────────────────────────────

  describe('deleteMeeting', () => {
    it('should throw NotFoundException when meeting does not exist', async () => {
      meetingRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteMeeting('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete blob, transcription, summary, and meeting record on success', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);

      await service.deleteMeeting(meeting.id);

      expect(blobStorageService.deleteBlob).toHaveBeenCalledWith(meeting.storedFileName);
      expect(transcriptionsService.deleteByMeetingId).toHaveBeenCalledWith(meeting.id);
      expect(summariesService.deleteByMeetingId).toHaveBeenCalledWith(meeting.id);
      expect(meetingRepo.delete).toHaveBeenCalledWith(meeting.id);
    });

    it('should still delete DB record even if blob deletion fails', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      blobStorageService.deleteBlob.mockRejectedValue(new Error('Azure 404'));

      await service.deleteMeeting(meeting.id);

      // Despite blob error, the DB record and related records must be cleaned up
      expect(transcriptionsService.deleteByMeetingId).toHaveBeenCalledWith(meeting.id);
      expect(summariesService.deleteByMeetingId).toHaveBeenCalledWith(meeting.id);
      expect(meetingRepo.delete).toHaveBeenCalledWith(meeting.id);
    });
  });

  // ── toResponse (indirectly via findOne) ─────────────────────────────────────

  describe('toResponse (via findOne)', () => {
    it('should include transcription when meeting has one', async () => {
      const transcriptionMock = { id: 't1', text: 'hello', durationSeconds: 60, createdAt: new Date() };
      transcriptionsService.toResponse.mockReturnValue(transcriptionMock as any);

      const meeting = buildMeeting({ transcription: { id: 't1' } as any });
      meetingRepo.findOne.mockResolvedValue(meeting);

      const result = await service.findOne(meeting.id);
      expect(result.transcription).toEqual(transcriptionMock);
    });

    it('should include summary when meeting has one', async () => {
      const summaryMock = {
        id: 's1',
        overview: 'overview',
        keyPoints: [],
        actionItems: [],
        createdAt: new Date(),
      };
      summariesService.toResponse.mockReturnValue(summaryMock as any);

      const meeting = buildMeeting({ summary: { id: 's1' } as any });
      meetingRepo.findOne.mockResolvedValue(meeting);

      const result = await service.findOne(meeting.id);
      expect(result.summary).toEqual(summaryMock);
    });

    it('should have undefined transcription when meeting has none', async () => {
      const meeting = buildMeeting({ transcription: null });
      meetingRepo.findOne.mockResolvedValue(meeting);

      const result = await service.findOne(meeting.id);
      expect(result.transcription).toBeUndefined();
    });
  });
});
