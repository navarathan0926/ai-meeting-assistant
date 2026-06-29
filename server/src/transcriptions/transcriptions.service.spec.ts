import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { TranscriptionsService } from './transcriptions.service';
import { Transcription } from './entities/transcription.entity';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock the fs module while preserving non-mocked attributes to prevent other libraries from breaking
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn(),
    createReadStream: jest.fn(),
  };
});

// Mock the OpenAI module to avoid real HTTP calls
jest.mock('openai', () => {
  const mockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
    audio: {
      transcriptions: {
        create: jest.fn(),
      },
    },
  }));
  return {
    __esModule: true,
    default: mockOpenAI,
    OpenAI: mockOpenAI,
  };
});

const mockFs = fs as jest.Mocked<typeof fs>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildTranscription(overrides: Partial<Transcription> = {}): Transcription {
  const t = new Transcription();
  t.id = 'trans-uuid-1';
  t.text = 'Hello from the transcript.';
  t.durationSeconds = 120;
  t.createdAt = new Date('2024-01-01');
  return Object.assign(t, overrides);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('TranscriptionsService', () => {
  let service: TranscriptionsService;
  let transcriptionRepo: jest.Mocked<Repository<Transcription>>;
  let openaiInstance: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionsService,
        {
          provide: getRepositoryToken(Transcription),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              delete: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'test-api-key';
              if (key === 'OPENAI_WHISPER_MODEL') return 'whisper-1';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TranscriptionsService>(TranscriptionsService);
    transcriptionRepo = module.get(getRepositoryToken(Transcription));

    // Access the private openai instance
    openaiInstance = (service as any).openai;
  });

  // ── transcribeAudio ───────────────────────────────────────────────────────

  describe('transcribeAudio', () => {
    it('should throw InternalServerErrorException when audio file does not exist', async () => {
      mockFs.existsSync.mockReturnValueOnce(false);

      await expect(
        service.transcribeAudio({ filePath: '/tmp/missing.mp3', originalFileName: 'meeting.mp3' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should transcribe audio, save and return the transcription entity', async () => {
      mockFs.existsSync.mockReturnValueOnce(true);
      mockFs.createReadStream.mockReturnValueOnce('mock-stream' as any);

      const savedTranscription = buildTranscription();
      transcriptionRepo.create.mockReturnValue(savedTranscription);
      transcriptionRepo.save.mockResolvedValue(savedTranscription);

      openaiInstance.audio.transcriptions.create.mockResolvedValue({
        text: 'Hello from the transcript.',
        duration: 120,
      });

      const result = await service.transcribeAudio({
        filePath: '/tmp/meeting.mp3',
        originalFileName: 'meeting.mp3',
      });

      expect(openaiInstance.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file: 'mock-stream',
          model: 'whisper-1',
          response_format: 'verbose_json',
        }),
      );
      expect(transcriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello from the transcript.',
          durationSeconds: 120,
        }),
      );
      expect(transcriptionRepo.save).toHaveBeenCalledWith(savedTranscription);
      expect(result).toBe(savedTranscription);
    });

    it('should throw InternalServerErrorException when OpenAI Whisper API fails', async () => {
      mockFs.existsSync.mockReturnValueOnce(true);
      mockFs.createReadStream.mockReturnValueOnce('mock-stream' as any);

      openaiInstance.audio.transcriptions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      await expect(
        service.transcribeAudio({ filePath: '/tmp/meeting.mp3', originalFileName: 'meeting.mp3' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle null/undefined duration from OpenAI response gracefully', async () => {
      mockFs.existsSync.mockReturnValueOnce(true);
      mockFs.createReadStream.mockReturnValueOnce('mock-stream' as any);

      const savedTranscription = buildTranscription({ durationSeconds: null });
      transcriptionRepo.create.mockReturnValue(savedTranscription);
      transcriptionRepo.save.mockResolvedValue(savedTranscription);

      openaiInstance.audio.transcriptions.create.mockResolvedValue({
        text: 'Some text',
        // no duration field
      });

      const result = await service.transcribeAudio({
        filePath: '/tmp/meeting.mp3',
        originalFileName: 'meeting.mp3',
      });

      expect(transcriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ durationSeconds: null }),
      );
      expect(result).toBe(savedTranscription);
    });
  });

  // ── toResponse ────────────────────────────────────────────────────────────

  describe('toResponse', () => {
    it('should map all entity fields to the response interface', () => {
      const transcription = buildTranscription();

      const result = service.toResponse(transcription);

      expect(result).toEqual({
        id: transcription.id,
        text: transcription.text,
        durationSeconds: transcription.durationSeconds,
        createdAt: transcription.createdAt,
      });
    });

    it('should include null durationSeconds when not present', () => {
      const transcription = buildTranscription({ durationSeconds: null });
      const result = service.toResponse(transcription);
      expect(result.durationSeconds).toBeNull();
    });
  });
});
