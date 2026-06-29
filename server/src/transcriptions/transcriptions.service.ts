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
        model:
          this.configService.get<string>('OPENAI_WHISPER_MODEL') || 'whisper-1',
        response_format: 'verbose_json',
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
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new InternalServerErrorException(
        'Failed to transcribe audio. Please check your OpenAI API key permissions (ensure Audio/Whisper is enabled) and file format.',
      );
    }
  }

  toResponse(transcription: Transcription): TranscriptionResponse {
    return {
      id: transcription.id,
      text: transcription.text,
      durationSeconds: transcription.durationSeconds,
      createdAt: transcription.createdAt,
    };
  }
}
