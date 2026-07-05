import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractionProcessor } from './extraction.processor';
import { Meeting } from '../meetings/entities/meeting.entity';
import { MeetingStatus } from '../meetings/enums/meeting-status.enum';
import { TranscriptionsService } from '../transcriptions/transcriptions.service';
import { SummariesService } from '../summaries/summaries.service';
import { BlobStorageService } from '../storage/blob-storage.service';
import { ItemExtractionService } from '../extracted-items/item-extraction.service';
import { Transcription } from '../transcriptions/entities/transcription.entity';
import { Summary } from '../summaries/entities/summary.entity';

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildMeeting(overrides: Partial<Meeting> = {}): Meeting {
  const m = new Meeting();
  m.id = 'meeting-uuid';
  m.originalFileName = 'meeting.mp3';
  m.storedFileName = 'stored-uuid.mp3';
  m.status = MeetingStatus.PENDING;
  m.errorMessage = null;
  m.createdAt = new Date();
  m.updatedAt = new Date();
  return Object.assign(m, overrides);
}

function buildJob(overrides: Partial<any> = {}) {
  return {
    id: 'job-1',
    data: { meetingId: 'meeting-uuid', storedFileName: 'stored-uuid.mp3' },
    attemptsMade: 0,
    opts: { attempts: 3 },
    updateProgress: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildTranscription(): Transcription {
  const t = new Transcription();
  t.id = 'trans-uuid';
  t.text = 'Hello world';
  t.durationSeconds = 60;
  t.createdAt = new Date();
  return t;
}

function buildSummary(): Summary {
  const s = new Summary();
  s.id = 'sum-uuid';
  s.overview = 'Meeting overview';
  s.keyPoints = ['Point A'];
  s.actionItems = ['Action 1'];
  s.createdAt = new Date();
  return s;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ExtractionProcessor', () => {
  let processor: ExtractionProcessor;
  let meetingRepo: jest.Mocked<Repository<Meeting>>;
  let transcriptionsService: jest.Mocked<TranscriptionsService>;
  let summariesService: jest.Mocked<SummariesService>;
  let blobStorageService: jest.Mocked<BlobStorageService>;
  let itemExtractionService: jest.Mocked<ItemExtractionService>;

  const mockCleanup = jest.fn().mockResolvedValue(undefined);
  let savedStatusesTracker: MeetingStatus[] = [];

  beforeEach(async () => {
    jest.clearAllMocks();
    savedStatusesTracker = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionProcessor,
        {
          provide: getRepositoryToken(Meeting),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn().mockImplementation((m) => {
              savedStatusesTracker.push(m.status);
              const copy = Object.create(Object.getPrototypeOf(m));
              Object.assign(copy, m);
              return Promise.resolve(copy);
            }),
          },
        },
        {
          provide: TranscriptionsService,
          useValue: {
            transcribeAudio: jest.fn(),
          },
        },
        {
          provide: SummariesService,
          useValue: {
            summariseTranscript: jest.fn(),
          },
        },
        {
          provide: BlobStorageService,
          useValue: {
            downloadToTempFile: jest.fn().mockResolvedValue({
              filePath: '/tmp/audio.mp3',
              cleanup: mockCleanup,
            }),
          },
        },
        {
          provide: ItemExtractionService,
          useValue: {
            addExtractItemsJob: jest.fn().mockResolvedValue('item-job-1'),
          },
        },
      ],
    }).compile();

    processor = module.get<ExtractionProcessor>(ExtractionProcessor);
    meetingRepo = module.get(getRepositoryToken(Meeting));
    transcriptionsService = module.get(TranscriptionsService);
    summariesService = module.get(SummariesService);
    blobStorageService = module.get(BlobStorageService);
    itemExtractionService = module.get(ItemExtractionService);
  });

  // ── process — meeting not found ───────────────────────────────────────────

  describe('process', () => {
    it('should return early and log warning when meeting is not found', async () => {
      meetingRepo.findOne.mockResolvedValue(null);
      const job = buildJob();

      await expect(processor.process(job as any)).resolves.toBeUndefined();

      expect(blobStorageService.downloadToTempFile).not.toHaveBeenCalled();
      expect(transcriptionsService.transcribeAudio).not.toHaveBeenCalled();
    });

    it('should process meeting through full pipeline on success', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);

      const transcription = buildTranscription();
      transcriptionsService.transcribeAudio.mockResolvedValue(transcription);

      const summary = buildSummary();
      summariesService.summariseTranscript.mockResolvedValue(summary);

      const job = buildJob();
      await processor.process(job as any);

      // Status progression: PROCESSING → COMPLETED
      expect(savedStatusesTracker).toContain(MeetingStatus.PROCESSING);
      expect(savedStatusesTracker[savedStatusesTracker.length - 1]).toBe(MeetingStatus.COMPLETED);

      // Transcription called with temp file path
      expect(transcriptionsService.transcribeAudio).toHaveBeenCalledWith({
        filePath: '/tmp/audio.mp3',
        originalFileName: meeting.originalFileName,
      });

      // Summarise called with transcript text
      expect(summariesService.summariseTranscript).toHaveBeenCalledWith({
        transcript: transcription.text,
      });

      expect(itemExtractionService.addExtractItemsJob).toHaveBeenCalledWith(
        'meeting-uuid',
      );
    });

    it('should call cleanup in the finally block even on success', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      transcriptionsService.transcribeAudio.mockResolvedValue(buildTranscription());
      summariesService.summariseTranscript.mockResolvedValue(buildSummary());

      const job = buildJob();
      await processor.process(job as any);

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('should call cleanup in the finally block when an error occurs', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      transcriptionsService.transcribeAudio.mockRejectedValue(new Error('Whisper failure'));

      const job = buildJob({ attemptsMade: 2, opts: { attempts: 3 } }); // last attempt
      await expect(processor.process(job as any)).rejects.toThrow('Whisper failure');

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('should set meeting status to FAILED on the last failed attempt', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      transcriptionsService.transcribeAudio.mockRejectedValue(new Error('Transcription error'));

      const job = buildJob({ attemptsMade: 2, opts: { attempts: 3 } }); // last attempt
      await expect(processor.process(job as any)).rejects.toThrow();

      const lastSaveCall = meetingRepo.save.mock.calls[meetingRepo.save.mock.calls.length - 1][0];
      expect(lastSaveCall.status).toBe(MeetingStatus.FAILED);
      expect(lastSaveCall.errorMessage).toBe('Transcription error');
    });

    it('should NOT set status to FAILED on a non-final retry attempt', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      transcriptionsService.transcribeAudio.mockRejectedValue(new Error('Temporary error'));

      const job = buildJob({ attemptsMade: 0, opts: { attempts: 3 } }); // first attempt
      await expect(processor.process(job as any)).rejects.toThrow();

      // Should only have been saved for status PROCESSING (not FAILED)
      const savedStatuses = meetingRepo.save.mock.calls.map((c) => c[0].status);
      expect(savedStatuses).not.toContain(MeetingStatus.FAILED);
    });

    it('should update job progress from 0 → 25 → 50 → 75 → 100 on success', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      transcriptionsService.transcribeAudio.mockResolvedValue(buildTranscription());
      summariesService.summariseTranscript.mockResolvedValue(buildSummary());

      const job = buildJob();
      await processor.process(job as any);

      const progressCalls = job.updateProgress.mock.calls.map((c: any[]) => c[0]);
      expect(progressCalls).toEqual([0, 25, 50, 75, 100]);
    });

    it('should re-throw the error after handling it so BullMQ applies retry policy', async () => {
      const meeting = buildMeeting();
      meetingRepo.findOne.mockResolvedValue(meeting);
      const error = new Error('API crash');
      transcriptionsService.transcribeAudio.mockRejectedValue(error);

      const job = buildJob({ attemptsMade: 0, opts: { attempts: 3 } });
      await expect(processor.process(job as any)).rejects.toThrow('API crash');
    });
  });
});
