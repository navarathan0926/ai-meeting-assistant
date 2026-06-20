import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ExtractionService } from './extraction.service';

describe('ExtractionService', () => {
  let service: ExtractionService;
  let extractionQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionService,
        {
          provide: getQueueToken('extraction'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExtractionService>(ExtractionService);
    extractionQueue = module.get(getQueueToken('extraction'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── addExtractJob ─────────────────────────────────────────────────────────

  describe('addExtractJob', () => {
    it('should add a job to the extraction queue with correct data and options', async () => {
      const mockJob = { id: 'job-id-abc' };
      extractionQueue.add.mockResolvedValue(mockJob as any);

      const jobId = await service.addExtractJob('meeting-uuid', 'stored-file.mp3');

      expect(extractionQueue.add).toHaveBeenCalledWith(
        'extract',
        { meetingId: 'meeting-uuid', storedFileName: 'stored-file.mp3' },
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({ type: 'exponential', delay: 5000 }),
          removeOnComplete: expect.objectContaining({ count: 100 }),
          removeOnFail: false,
        }),
      );
      expect(jobId).toBe('job-id-abc');
    });

    it('should return the job id string from the created job', async () => {
      extractionQueue.add.mockResolvedValue({ id: 'unique-job-123' } as any);
      const result = await service.addExtractJob('m1', 'audio.mp3');
      expect(result).toBe('unique-job-123');
    });

    it('should propagate queue errors', async () => {
      extractionQueue.add.mockRejectedValue(new Error('Redis connection failed'));
      await expect(service.addExtractJob('m1', 'f.mp3')).rejects.toThrow('Redis connection failed');
    });
  });
});
