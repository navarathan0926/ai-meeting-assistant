import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import { openAiConfiguration } from '../common/config/openai.config';
import { ConfigType } from '@nestjs/config';
import { Transcription } from './entities/transcription.entity';
import { TranscribeDto } from './dto/transcribe.dto';
import { TranscriptionResponse } from './interfaces/transcription-response.interface';

@Injectable()
export class TranscriptionsService {
  private readonly logger = new Logger(TranscriptionsService.name);
  private readonly openai: OpenAI;
  private readonly whisperModel: string;

  constructor(
    @InjectRepository(Transcription)
    private readonly transcriptionRepository: Repository<Transcription>,
    @Inject(openAiConfiguration.KEY)
    openAiConfig: ConfigType<typeof openAiConfiguration>,
  ) {
    this.logger.debug(`OpenAI API Key present: ${!!openAiConfig.apiKey}`);
    this.whisperModel = openAiConfig.whisperModel;
    this.openai = new OpenAI({
      apiKey: openAiConfig.apiKey,
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
        model: this.whisperModel,
        response_format: 'verbose_json',
      });

      const durationSeconds =
        'duration' in whisperResponse &&
        typeof whisperResponse.duration === 'number'
          ? whisperResponse.duration
          : null;

      const transcription = this.transcriptionRepository.create({
        text: whisperResponse.text,
        durationSeconds,
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
