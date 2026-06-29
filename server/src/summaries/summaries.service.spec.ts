import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SummariesService } from './summaries.service';
import { Summary } from './entities/summary.entity';

// ── Mock OpenAI ────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildSummary(overrides: Partial<Summary> = {}): Summary {
  const s = new Summary();
  s.id = 'sum-uuid-1';
  s.overview = 'This meeting discussed Q2 targets.';
  s.keyPoints = ['Budget approved', 'Timeline set'];
  s.actionItems = ['Send report to John', 'Schedule follow-up'];
  s.createdAt = new Date('2024-01-01');
  return Object.assign(s, overrides);
}

const VALID_GPT_RESPONSE = {
  overview: 'Q2 planning session',
  keyPoints: ['Budget approved', 'Timeline confirmed'],
  actionItems: ['Send report', 'Follow up'],
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SummariesService', () => {
  let service: SummariesService;
  let summaryRepo: jest.Mocked<Repository<Summary>>;
  let openaiInstance: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummariesService,
        {
          provide: getRepositoryToken(Summary),
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
              if (key === 'OPENAI_GPT_MODEL') return 'gpt-4o-mini';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SummariesService>(SummariesService);
    summaryRepo = module.get(getRepositoryToken(Summary));
    openaiInstance = (service as any).openai;
  });

  // ── summariseTranscript ───────────────────────────────────────────────────

  describe('summariseTranscript', () => {
    it('should call GPT, save summary, and return the entity', async () => {
      const savedSummary = buildSummary();
      summaryRepo.create.mockReturnValue(savedSummary);
      summaryRepo.save.mockResolvedValue(savedSummary);

      openaiInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(VALID_GPT_RESPONSE) } }],
      });

      const result = await service.summariseTranscript({
        transcript: 'Transcript text here',
      });

      expect(openaiInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
        }),
      );
      expect(summaryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          overview: VALID_GPT_RESPONSE.overview,
          keyPoints: VALID_GPT_RESPONSE.keyPoints,
          actionItems: VALID_GPT_RESPONSE.actionItems,
        }),
      );
      expect(summaryRepo.save).toHaveBeenCalledWith(savedSummary);
      expect(result).toBe(savedSummary);
    });

    it('should throw InternalServerErrorException when GPT returns an empty response', async () => {
      openaiInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(
        service.summariseTranscript({ transcript: 'Some transcript' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when GPT returns malformed JSON', async () => {
      openaiInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'not-valid-json{{{{' } }],
      });

      await expect(
        service.summariseTranscript({ transcript: 'Some transcript' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when GPT JSON is missing required fields', async () => {
      // overview is missing
      openaiInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ keyPoints: [], actionItems: [] }),
            },
          },
        ],
      });

      await expect(
        service.summariseTranscript({ transcript: 'Some transcript' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when GPT returns keyPoints as non-array', async () => {
      openaiInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overview: 'ok',
                keyPoints: 'not-an-array',
                actionItems: [],
              }),
            },
          },
        ],
      });

      await expect(
        service.summariseTranscript({ transcript: 'Some transcript' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when OpenAI API itself throws', async () => {
      openaiInstance.chat.completions.create.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        service.summariseTranscript({ transcript: 'Some transcript' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should pass the full transcript as user message content', async () => {
      const savedSummary = buildSummary();
      summaryRepo.create.mockReturnValue(savedSummary);
      summaryRepo.save.mockResolvedValue(savedSummary);

      openaiInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(VALID_GPT_RESPONSE) } }],
      });

      const transcript = 'This is the full meeting transcript.';
      await service.summariseTranscript({ transcript });

      const callArgs = openaiInstance.chat.completions.create.mock.calls[0][0];
      const userMsg = callArgs.messages.find((m: any) => m.role === 'user');
      expect(userMsg.content).toContain(transcript);
    });
  });

  // ── toResponse ────────────────────────────────────────────────────────────

  describe('toResponse', () => {
    it('should map all summary entity fields to the response interface', () => {
      const summary = buildSummary();

      const result = service.toResponse(summary);

      expect(result).toEqual({
        id: summary.id,
        overview: summary.overview,
        keyPoints: summary.keyPoints,
        actionItems: summary.actionItems,
        createdAt: summary.createdAt,
      });
    });

    it('should return empty arrays for keyPoints and actionItems when set to []', () => {
      const summary = buildSummary({ keyPoints: [], actionItems: [] });
      const result = service.toResponse(summary);
      expect(result.keyPoints).toEqual([]);
      expect(result.actionItems).toEqual([]);
    });
  });
});
