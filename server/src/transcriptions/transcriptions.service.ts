import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import { Transcription } from './entities/transcription.entity';
import { TranscribeDto } from './dto/transcribe.dto';
import { TranscriptionResponse } from './interfaces/transcription-response.interface';

/**
 * TranscriptionsService
 * Responsible for:
 *  1. Sending the audio file to OpenAI Whisper API.
 *  2. Persisting the resulting Transcription entity.
 *  3. Mapping the entity to the client-facing TranscriptionResponse.
 *
 * This service knows NOTHING about meetings — it only deals with
 * transcription data. MeetingsService orchestrates when to call it.
 */
@Injectable()
export class TranscriptionsService {
  private readonly logger = new Logger(TranscriptionsService.name);
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(Transcription)
    private readonly transcriptionRepository: Repository<Transcription>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.logger.debug(`OpenAI API Key present: ${!!apiKey}`);
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * transcribeAudio
   * Streams the file to Whisper, saves the result, and returns a
   * TranscriptionResponse. The `meeting` relation is set by the caller
   * (MeetingsService) after calling this method.
   */
  async transcribeAudio(dto: TranscribeDto): Promise<Transcription> {
    this.logger.log(`Transcribing file from path: ${dto.filePath}`);

    if (!fs.existsSync(dto.filePath)) {
      throw new InternalServerErrorException(
        `Audio file not found at path: ${dto.filePath}`,
      );
    }

    try {
      const audioStream = fs.createReadStream(dto.filePath);

      const whisperResponse = await this.openai.audio.transcriptions.create({
        file: audioStream,
        model: this.configService.get<string>('OPENAI_WHISPER_MODEL') || 'whisper-1',
        response_format: 'verbose_json', // gives us duration
      });

      const transcription = this.transcriptionRepository.create({
        text: whisperResponse.text,
        durationSeconds: (whisperResponse as any).duration ?? null,
      });

      const saved = await this.transcriptionRepository.save(transcription);
      this.logger.log(`Transcription saved with id: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Whisper API error: ${error.message || error}`);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw new InternalServerErrorException(
        'Failed to transcribe audio. Please check your OpenAI API key permissions (ensure Audio/Whisper is enabled) and file format.',
      );
    }
  }

  /**
   * deleteByMeetingId
   * Removes the transcription row whose FK points to the given meeting.
   * Safe to call even if no transcription exists yet (e.g. PENDING meetings).
   */
  async deleteByMeetingId(meetingId: string): Promise<void> {
    await this.transcriptionRepository
      .createQueryBuilder()
      .delete()
      .where('"meetingId" = :meetingId', { meetingId })
      .execute();
  }

  /** Map a Transcription entity to the client-facing interface */
  toResponse(transcription: Transcription): TranscriptionResponse {
    return {
      id: transcription.id,
      text: transcription.text,
      durationSeconds: transcription.durationSeconds,
      createdAt: transcription.createdAt,
    };
  }
}
