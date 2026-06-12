import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Summary } from './entities/summary.entity';
import { SummarizeDto } from './dto/summarize.dto';
import { SummaryResponse } from './interfaces/summary-response.interface';

/** Shape expected from GPT structured output */
interface GptSummaryOutput {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
}

/**
 * SummariesService
 * Responsible for:
 *  1. Sending a transcript to OpenAI GPT for structured summarisation.
 *  2. Parsing the structured JSON response into distinct fields.
 *  3. Persisting the Summary entity.
 *  4. Mapping the entity to the client-facing SummaryResponse.
 */
@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(Summary)
    private readonly summaryRepository: Repository<Summary>,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * summariseTranscript
   * Calls GPT-4o-mini with a structured prompt and persists the result.
   * Uses JSON mode to guarantee a parseable response.
   */
  async summariseTranscript(dto: SummarizeDto): Promise<Summary> {
    this.logger.log('Requesting GPT summary...');

    const systemPrompt = `You are an expert meeting analyst. Given a meeting transcript, 
return a JSON object with exactly these three fields:
- "overview": A concise 2-3 sentence paragraph summarising the meeting's purpose and outcome.
- "keyPoints": An array of strings, each a major discussion point (max 8 items).
- "actionItems": An array of strings, each a specific follow-up action with an owner if mentioned (max 10 items).
Respond ONLY with valid JSON. No markdown, no extra text.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_GPT_MODEL') || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Here is the meeting transcript:\n\n${dto.transcript}`,
          },
        ],
        temperature: 0.3, // lower = more deterministic, structured output
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new Error('GPT returned an empty response.');
      }

      const parsed: GptSummaryOutput = JSON.parse(raw);
      this.validateGptOutput(parsed);

      const summary = this.summaryRepository.create({
        overview: parsed.overview,
        keyPoints: parsed.keyPoints,
        actionItems: parsed.actionItems,
      });

      const saved = await this.summaryRepository.save(summary);
      this.logger.log(`Summary saved with id: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error('GPT summarisation error', error);
      throw new InternalServerErrorException(
        'Failed to generate meeting summary. Please try again.',
      );
    }
  }

  /** Guard against malformed GPT JSON responses */
  private validateGptOutput(output: GptSummaryOutput): void {
    if (
      typeof output.overview !== 'string' ||
      !Array.isArray(output.keyPoints) ||
      !Array.isArray(output.actionItems)
    ) {
      throw new Error('GPT response does not match expected schema.');
    }
  }

  /**
   * deleteByMeetingId
   * Removes the summary row whose FK points to the given meeting.
   * Safe to call even if no summary exists yet.
   */
  async deleteByMeetingId(meetingId: string): Promise<void> {
    await this.summaryRepository
      .createQueryBuilder()
      .delete()
      .where('"meetingId" = :meetingId', { meetingId })
      .execute();
  }

  /** Map a Summary entity to the client-facing interface */
  toResponse(summary: Summary): SummaryResponse {
    return {
      id: summary.id,
      overview: summary.overview,
      keyPoints: summary.keyPoints,
      actionItems: summary.actionItems,
      createdAt: summary.createdAt,
    };
  }
}
