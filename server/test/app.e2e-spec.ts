import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { HealthController } from '../src/health/health.controller';
import { MeetingsController } from '../src/meetings/meetings.controller';
import { MeetingsService } from '../src/meetings/meetings.service';
import { TranscriptionsService } from '../src/transcriptions/transcriptions.service';
import { SummariesService } from '../src/summaries/summaries.service';
import { BlobStorageService } from '../src/storage/blob-storage.service';
import { ExtractionService } from '../src/extraction/extraction.service';
import { Meeting } from '../src/meetings/entities/meeting.entity';
import { MeetingStatus } from '../src/meetings/enums/meeting-status.enum';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ExtractionController } from '../src/extraction/extraction.controller';
import { NotFoundException } from '@nestjs/common';
import { AuthGuard } from '../src/common/guards/auth.guard';

// ── Mock data ──────────────────────────────────────────────────────────────────

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const INVALID_UUID = 'not-a-valid-uuid';
const TEST_USER_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

const SAMPLE_MEETING: Meeting = {
  id: VALID_UUID,
  originalFileName: 'standup.mp3',
  title: 'standup',
  storedFileName: 'stored-uuid.mp3',
  status: MeetingStatus.PENDING,
  errorMessage: null,
  userId: TEST_USER_ID,
  user: null as any,
  transcription: null,
  summary: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ── Mocked service implementations ────────────────────────────────────────────

const mockMeetingsService = {
  createFromUpload: jest.fn(),
  findAll: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  deleteMeeting: jest.fn().mockResolvedValue(undefined),
  assertOwned: jest.fn().mockResolvedValue(undefined),
};

const mockExtractionQueue = {
  getJob: jest.fn(),
};

// ── App factory ───────────────────────────────────────────────────────────────

async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ],
    controllers: [
      AppController,
      HealthController,
      MeetingsController,
      ExtractionController,
    ],
    providers: [
      AppService,
      {
        provide: MeetingsService,
        useValue: mockMeetingsService,
      },
      // Provide TranscriptionsService & SummariesService as no-ops
      // (MeetingsService is fully mocked so these won't be called)
      { provide: TranscriptionsService, useValue: {} },
      { provide: SummariesService, useValue: {} },
      { provide: BlobStorageService, useValue: {} },
      { provide: ExtractionService, useValue: {} },
      { provide: getRepositoryToken(Meeting), useValue: {} },
      { provide: getQueueToken('extraction'), useValue: mockExtractionQueue },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        req.user = {
          id: TEST_USER_ID,
          email: 'test@example.com',
          name: 'Test User',
        };
        return true;
      },
    })
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply the same global middleware as main.ts
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.setGlobalPrefix('api');

  await app.init();
  return app;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('App (E2E Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default implementations
    mockMeetingsService.findAll.mockResolvedValue([]);
    mockMeetingsService.deleteMeeting.mockResolvedValue(undefined);
  });

  // ── Health ────────────────────────────────────────────────────────────────

  describe('GET /api/health', () => {
    it('should return 200 with status healthy', async () => {
      const res = await request(app.getHttpServer()).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.uptime).toBeDefined();
      expect(res.body.data.timestamp).toBeDefined();
    });
  });

  // ── GET /api/meetings ─────────────────────────────────────────────────────

  describe('GET /api/meetings', () => {
    it('should return 200 with wrapped empty array', async () => {
      const res = await request(app.getHttpServer()).get('/api/meetings');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        data: [],
        statusCode: 200,
      });
      expect(res.body.timestamp).toBeDefined();
    });

    it('should return 200 with a list of meetings', async () => {
      mockMeetingsService.findAll.mockResolvedValue([
        {
          id: VALID_UUID,
          originalFileName: 'standup.mp3',
          title: 'standup',
          status: MeetingStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app.getHttpServer()).get('/api/meetings');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(VALID_UUID);
    });

    it('should pass the search query to the service', async () => {
      mockMeetingsService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/api/meetings?search=standup');

      expect(mockMeetingsService.findAll).toHaveBeenCalledWith(
        TEST_USER_ID,
        'standup',
      );
    });
  });

  // ── GET /api/meetings/:id ─────────────────────────────────────────────────

  describe('GET /api/meetings/:id', () => {
    it('should return 400 when id is not a valid UUID', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/meetings/${INVALID_UUID}`,
      );
      expect(res.status).toBe(400);
    });

    it('should return 404 when meeting does not exist', async () => {
      mockMeetingsService.findOne.mockRejectedValue(
        new NotFoundException(`Meeting with id "${VALID_UUID}" not found.`),
      );

      const res = await request(app.getHttpServer()).get(
        `/api/meetings/${VALID_UUID}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should return 200 with wrapped meeting data for a valid existing id', async () => {
      const meetingResponse = {
        id: VALID_UUID,
        originalFileName: 'standup.mp3',
        title: 'standup',
        status: MeetingStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMeetingsService.findOne.mockResolvedValue(meetingResponse);

      const res = await request(app.getHttpServer()).get(
        `/api/meetings/${VALID_UUID}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(VALID_UUID);
      expect(res.body.statusCode).toBe(200);
    });
  });

  // ── POST /api/meetings/upload ─────────────────────────────────────────────

  describe('POST /api/meetings/upload', () => {
    it('should return 400 when no file is attached', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      mockMeetingsService.createFromUpload.mockRejectedValue(
        new BadRequestException('No audio file provided.'),
      );

      const res = await request(app.getHttpServer())
        .post('/api/meetings/upload')
        .send();

      expect(res.status).toBe(400);
    });

    it('should return 202 when a valid audio file is uploaded', async () => {
      const pendingMeeting = {
        id: VALID_UUID,
        originalFileName: 'meeting.mp3',
        title: 'meeting',
        status: MeetingStatus.PENDING,
        jobId: 'job-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMeetingsService.createFromUpload.mockResolvedValue(pendingMeeting);

      const res = await request(app.getHttpServer())
        .post('/api/meetings/upload')
        .attach('audio', Buffer.from('fake-audio-content'), {
          filename: 'meeting.mp3',
          contentType: 'audio/mpeg',
        });

      expect(res.status).toBe(202);
      expect(res.body.data.id).toBe(VALID_UUID);
      expect(res.body.data.status).toBe(MeetingStatus.PENDING);
    });
  });

  // ── DELETE /api/meetings/:id ──────────────────────────────────────────────

  describe('DELETE /api/meetings/:id', () => {
    it('should return 400 when id is not a valid UUID', async () => {
      const res = await request(app.getHttpServer()).delete(
        `/api/meetings/${INVALID_UUID}`,
      );
      expect(res.status).toBe(400);
    });

    it('should return 404 when meeting does not exist', async () => {
      mockMeetingsService.deleteMeeting.mockRejectedValue(
        new NotFoundException(`Meeting with id "${VALID_UUID}" not found.`),
      );

      const res = await request(app.getHttpServer()).delete(
        `/api/meetings/${VALID_UUID}`,
      );

      expect(res.status).toBe(404);
    });

    it('should return 204 No Content on successful deletion', async () => {
      mockMeetingsService.deleteMeeting.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer()).delete(
        `/api/meetings/${VALID_UUID}`,
      );

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });
  });

  // ── GET /api/extraction/:jobId/status ─────────────────────────────────────

  describe('GET /api/extraction/:jobId/status', () => {
    it('should return 404 when job is not found in the queue', async () => {
      mockExtractionQueue.getJob.mockResolvedValue(null);

      const res = await request(app.getHttpServer()).get(
        '/api/extraction/job-999/status',
      );

      expect(res.status).toBe(404);
    });

    it('should return 200 with job status details when job exists', async () => {
      const mockJob = {
        id: 'job-123',
        getState: jest.fn().mockResolvedValue('completed'),
        progress: 100,
        failedReason: undefined,
        data: { meetingId: VALID_UUID },
        attemptsMade: 1,
      };
      mockExtractionQueue.getJob.mockResolvedValue(mockJob);
      mockMeetingsService.assertOwned.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer()).get(
        '/api/extraction/job-123/status',
      );

      expect(mockMeetingsService.assertOwned).toHaveBeenCalledWith(
        TEST_USER_ID,
        VALID_UUID,
      );
      expect(res.status).toBe(200);
      expect(res.body.data.jobId).toBe('job-123');
      expect(res.body.data.state).toBe('completed');
      expect(res.body.data.meetingId).toBe(VALID_UUID);
    });
  });
});
