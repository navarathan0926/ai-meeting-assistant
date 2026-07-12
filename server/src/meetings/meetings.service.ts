import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigType } from '@nestjs/config';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Meeting } from './entities/meeting.entity';
import { MeetingStatus } from './enums/meeting-status.enum';
import { MeetingResponse } from './interfaces/meeting-response.interface';
import { TranscriptionsService } from '../transcriptions/transcriptions.service';
import { SummariesService } from '../summaries/summaries.service';
import { BlobStorageService } from '../storage/blob-storage.service';
import { ExtractionService } from '../extraction/extraction.service';
import { extractionConfiguration } from '../common/config/extraction.config';
import { normalizeExtractionAnalysis } from './extraction-analysis.util';
import type { Express } from 'express';

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-m4a',
  'video/mp4',
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly transcriptionsService: TranscriptionsService,
    private readonly summariesService: SummariesService,
    private readonly blobStorageService: BlobStorageService,
    private readonly extractionService: ExtractionService,
    @Inject(extractionConfiguration.KEY)
    private readonly extractionConfig: ConfigType<typeof extractionConfiguration>,
  ) {}

  async createFromUpload(
    file: Express.Multer.File,
    userId: string,
  ): Promise<MeetingResponse> {
    this.validateFile(file);

    const storedFileName = this.buildStoredFileName(file);

    await this.blobStorageService.uploadBuffer(storedFileName, file.buffer, {
      contentType: file.mimetype,
    });
    this.logger.log(`File uploaded to Blob Storage: ${storedFileName}`);

    const title = path.basename(
      file.originalname,
      path.extname(file.originalname),
    );

    const meeting = this.meetingRepository.create({
      originalFileName: file.originalname,
      title,
      storedFileName,
      status: MeetingStatus.PENDING,
      userId,
    });
    const saved = await this.meetingRepository.save(meeting);

    const jobId = await this.extractionService.addExtractJob(
      saved.id,
      saved.storedFileName,
    );

    return this.toResponse(saved, jobId);
  }

  async findOne(userId: string, id: string): Promise<MeetingResponse> {
    const meeting = await this.meetingRepository.findOne({
      where: { id, userId },
      relations: ['transcription', 'summary'],
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id "${id}" not found.`);
    }
    return this.toResponse(meeting);
  }

  async findAll(
    userId: string,
    options: { page: number; limit: number; search?: string },
  ): Promise<{ items: MeetingResponse[]; total: number }> {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const qb = this.meetingRepository
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.transcription', 'transcription')
      .leftJoinAndSelect('meeting.summary', 'summary')
      .where('meeting.userId = :userId', { userId })
      .orderBy('meeting.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search?.trim()) {
      qb.andWhere(
        '(meeting.title ILIKE :q OR meeting.originalFileName ILIKE :q)',
        { q: `%${search.trim()}%` },
      );
    }

    const [meetings, total] = await qb.getManyAndCount();
    const items = await Promise.all(
      meetings.map((meeting) => this.toResponse(meeting, undefined, false)),
    );

    return { items, total };
  }

  async deleteMeeting(userId: string, id: string): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id, userId },
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id "${id}" not found.`);
    }

    try {
      await this.blobStorageService.deleteBlob(meeting.storedFileName);
    } catch (err) {
      this.logger.warn(
        `Could not delete blob "${meeting.storedFileName}" for meeting ${id}: ${(err as Error).message}`,
      );
    }

    await this.meetingRepository.delete(id);
    this.logger.log(`Meeting ${id} deleted.`);
  }

  async assertOwned(userId: string, meetingId: string): Promise<void> {
    const exists = await this.meetingRepository.exists({
      where: { id: meetingId, userId },
    });
    if (!exists) {
      throw new NotFoundException(
        `Meeting with id "${meetingId}" not found.`,
      );
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No audio file provided.');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: mp3, mp4, wav, webm, ogg, m4a.`,
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File too large. Maximum size is 25 MB.`);
    }
  }

  private buildStoredFileName(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname).toLowerCase();
    return `${randomUUID()}${ext}`;
  }

  private toResponse(
    meeting: Meeting,
    jobId?: string,
    includeAudioUrl = true,
  ): MeetingResponse {
    let audioUrl: string | undefined;
    if (includeAudioUrl) {
      try {
        audioUrl = this.blobStorageService.getReadSasUrl(meeting.storedFileName);
      } catch (err) {
        this.logger.warn(
          `Unable to generate SAS URL for meeting ${meeting.id}: ${(err as Error).message}`,
        );
      }
    }

    return {
      id: meeting.id,
      originalFileName: meeting.originalFileName,
      title: meeting.title ?? null,
      audioUrl,
      status: meeting.status,
      errorMessage: meeting.errorMessage ?? undefined,
      jobId,
      transcription: meeting.transcription
        ? this.transcriptionsService.toResponse(meeting.transcription)
        : undefined,
      summary: meeting.summary
        ? this.summariesService.toResponse(meeting.summary)
        : undefined,
      extractionAnalysis: normalizeExtractionAnalysis(
        meeting.extractionAnalysis,
        this.extractionConfig.meetingRelevanceThreshold,
      ),
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }
}
