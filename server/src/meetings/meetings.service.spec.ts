import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MeetingsService } from './meetings.service';
import { Meeting } from './entities/meeting.entity';
import { MeetingStatus } from './enums/meeting-status.enum';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { TranscriptionsService } from '../transcriptions/transcriptions.service';
import { SummariesService } from '../summaries/summaries.service';
import { BlobStorageService } from '../storage/blob-storage.service';
import { ExtractionService } from '../extraction/extraction.service';
import { extractionConfiguration } from '../common/config/extraction.config';

const USER_ID = 'user-uuid-1';
const OTHER_USER_ID = 'user-uuid-2';
const ORG_ID = DEFAULT_ORGANIZATION_ID;

function buildUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = USER_ID;
  user.email = 'user@example.com';
  user.name = 'Test User';
  user.passwordHash = null;
  user.provider = 'local';
  user.googleId = null;
  user.role = UserRole.User;
  user.organizationId = ORG_ID;
  user.meetings = [];
  user.createdAt = new Date();
  user.updatedAt = new Date();
  return Object.assign(user, overrides);
}

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
  m.userId = USER_ID;
  m.organizationId = ORG_ID;
  m.transcription = null;
  m.summary = null;
  m.createdAt = new Date('2024-01-01');
  m.updatedAt = new Date('2024-01-01');
  return Object.assign(m, overrides);
}

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
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
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
            exists: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
          },
        },
        {
          provide: TranscriptionsService,
          useValue: { toResponse: jest.fn() },
        },
        {
          provide: SummariesService,
          useValue: { toResponse: jest.fn() },
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
        {
          provide: extractionConfiguration.KEY,
          useValue: {
            extractionConfidenceThreshold: 0.6,
            projectConfidenceThreshold: 0.6,
            meetingRelevanceThreshold: 0.7,
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

  describe('createFromUpload', () => {
    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        service.createFromUpload(null as any, buildUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsupported MIME type', async () => {
      const file = buildFile({ mimetype: 'text/plain' });
      await expect(service.createFromUpload(file, buildUser())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file exceeds 25 MB', async () => {
      const file = buildFile({ size: 26 * 1024 * 1024 });
      await expect(service.createFromUpload(file, buildUser())).rejects.toThrow(
        'File too large',
      );
    });

    it('should upload blob, save meeting with userId and queue extraction job', async () => {
      const file = buildFile();
      const user = buildUser();
      const savedMeeting = buildMeeting();
      meetingRepo.create.mockReturnValue(savedMeeting);
      meetingRepo.save.mockResolvedValue(savedMeeting);

      const result = await service.createFromUpload(file, user);

      expect(meetingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFileName: 'meeting.mp3',
          title: 'meeting',
          status: MeetingStatus.PENDING,
          userId: USER_ID,
          organizationId: ORG_ID,
        }),
      );
      expect(extractionService.addExtractJob).toHaveBeenCalledWith(
        savedMeeting.id,
        savedMeeting.storedFileName,
      );
      expect(result.jobId).toBe('job-id-123');
    });
  });

  describe('findOne', () => {
    it('should return a meeting when user has access', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);

      const result = await service.findOne(buildUser(), meeting.id);

      expect(meetingRepo.findOne).toHaveBeenCalledWith({
        where: { id: meeting.id },
        relations: ['transcription', 'summary'],
      });
      expect(result.id).toBe(meeting.id);
    });

    it('should throw NotFoundException when meeting does not exist', async () => {
      meetingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(buildUser(), 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the meeting', async () => {
      const meeting = buildMeeting({ userId: OTHER_USER_ID });
      meetingRepo.findOne.mockResolvedValue(meeting);

      await expect(
        service.findOne(buildUser(), meeting.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should filter by userId for regular users', async () => {
      const qb = meetingRepo.createQueryBuilder('meeting') as any;
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(buildUser(), { page: 1, limit: 20 });

      expect(qb.where).toHaveBeenCalledWith('meeting.userId = :userId', {
        userId: USER_ID,
      });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('should apply search filter with andWhere', async () => {
      const qb = meetingRepo.createQueryBuilder() as any;
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(buildUser(), { page: 1, limit: 20, search: 'standup' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ q: '%standup%' }),
      );
    });
  });

  describe('deleteMeeting', () => {
    it('should throw NotFoundException when meeting does not belong to user', async () => {
      meetingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteMeeting(OTHER_USER_ID, 'uuid-1234'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete blob and meeting record on success', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);

      await service.deleteMeeting(USER_ID, meeting.id);

      expect(meetingRepo.findOne).toHaveBeenCalledWith({
        where: { id: meeting.id, userId: USER_ID },
      });
      expect(blobStorageService.deleteBlob).toHaveBeenCalledWith(
        meeting.storedFileName,
      );
      expect(meetingRepo.delete).toHaveBeenCalledWith(meeting.id);
    });

    it('should still delete DB record even if blob deletion fails', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      blobStorageService.deleteBlob.mockRejectedValue(new Error('Azure 404'));

      await service.deleteMeeting(USER_ID, meeting.id);

      expect(meetingRepo.delete).toHaveBeenCalledWith(meeting.id);
    });
  });

  describe('assertAccessible', () => {
    it('should return meeting when user owns it', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);

      await expect(
        service.assertAccessible(buildUser(), meeting.id),
      ).resolves.toEqual(meeting);
    });

    it('should throw ForbiddenException when another user owns the meeting', async () => {
      const meeting = buildMeeting({ userId: OTHER_USER_ID });
      meetingRepo.findOne.mockResolvedValue(meeting);

      await expect(
        service.assertAccessible(buildUser(), meeting.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to access meetings in their organization', async () => {
      const meeting = buildMeeting({ userId: OTHER_USER_ID });
      meetingRepo.findOne.mockResolvedValue(meeting);

      await expect(
        service.assertAccessible(
          buildUser({ id: 'admin-1', role: UserRole.Admin }),
          meeting.id,
        ),
      ).resolves.toEqual(meeting);
    });
  });

  describe('toResponse (via findOne)', () => {
    it('should include transcription when meeting has one', async () => {
      const transcriptionMock = {
        id: 't1',
        text: 'hello',
        durationSeconds: 60,
        createdAt: new Date(),
      };
      transcriptionsService.toResponse.mockReturnValue(transcriptionMock as any);

      const meeting = buildMeeting({ transcription: { id: 't1' } as any });
      meetingRepo.findOne.mockResolvedValue(meeting);

      const result = await service.findOne(buildUser(), meeting.id);
      expect(result.transcription).toEqual(transcriptionMock);
    });

    it('should set audioUrl to undefined when SAS generation fails', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      blobStorageService.getReadSasUrl.mockImplementation(() => {
        throw new Error('SAS error');
      });

      const result = await service.findOne(buildUser(), meeting.id);
      expect(result.audioUrl).toBeUndefined();
    });
  });
});
