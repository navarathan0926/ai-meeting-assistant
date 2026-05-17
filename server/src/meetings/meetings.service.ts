import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Meeting } from './entities/meeting.entity';
import { MeetingStatus } from './enums/meeting-status.enum';
import { MeetingResponse } from './interfaces/meeting-response.interface';
import { TranscriptionsService } from '../transcriptions/transcriptions.service';
import { SummariesService } from '../summaries/summaries.service';
import { BlobStorageService } from '../storage/blob-storage.service';
import type { Express } from 'express';

/** Allowed MIME types for audio uploads */
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-m4a',
  'video/mp4', // some recorders save .mp4
];

/** Maximum file size: 25 MB (Whisper API limit) */
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * MeetingsService
 * Orchestrates the full pipeline for a meeting:
 *   upload → save file → create DB record → transcribe → summarise → update status
 *
 * It delegates AI calls to TranscriptionsService and SummariesService.
 * Business rules (validation, error handling, status transitions) live here.
 */
@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly transcriptionsService: TranscriptionsService,
    private readonly summariesService: SummariesService,
    private readonly blobStorageService: BlobStorageService,
  ) {}

  // ── Public API ────────────────────────────────────────────────────

  /**
   * createFromUpload
   * Called by the controller when a file is received.
   * Saves the file, creates a PENDING meeting record, then kicks off
   * async processing (non-blocking so the controller returns immediately).
   */
  async createFromUpload(file: Express.Multer.File): Promise<MeetingResponse> {
    this.validateFile(file);

    const storedFileName = this.buildStoredFileName(file);

    // Persist the uploaded buffer to Azure Blob Storage
    await this.blobStorageService.uploadBuffer(storedFileName, file.buffer, {
      contentType: file.mimetype,
    });
    this.logger.log(`File uploaded to Blob Storage: ${storedFileName}`);

    // Derive a human-friendly title from the filename (strip extension)
    const title = path.basename(
      file.originalname,
      path.extname(file.originalname),
    );

    // Create the meeting record immediately so the client gets an ID
    const meeting = this.meetingRepository.create({
      originalFileName: file.originalname,
      title,
      storedFileName,
      status: MeetingStatus.PENDING,
    });
    const saved = await this.meetingRepository.save(meeting);

    // Process asynchronously — caller gets the PENDING record right away
    this.processAsync(saved.id, storedFileName).catch((err) =>
      this.logger.error(`processAsync failed for meeting ${saved.id}`, err),
    );

    return this.toResponse(saved);
  }

  /** Find a single meeting by ID (with eagerly loaded relations) */
  async findOne(id: string): Promise<MeetingResponse> {
    const meeting = await this.meetingRepository.findOne({
      where: { id },
      relations: ['transcription', 'summary'],
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id "${id}" not found.`);
    }
    return this.toResponse(meeting);
  }

  /**
   * Find all meetings ordered by creation date (newest first).
   * Optionally filters by a search term against `title` and `originalFileName`
   * using case-insensitive ILIKE (Postgres).
   */
  async findAll(search?: string): Promise<MeetingResponse[]> {
    const qb = this.meetingRepository
      .createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.transcription', 'transcription')
      .leftJoinAndSelect('meeting.summary', 'summary')
      .orderBy('meeting.createdAt', 'DESC');

    if (search?.trim()) {
      qb.where(
        '(meeting.title ILIKE :q OR meeting.originalFileName ILIKE :q)',
        { q: `%${search.trim()}%` },
      );
    }

    const meetings = await qb.getMany();
    return Promise.all(meetings.map((m) => this.toResponse(m)));
  }

  // ── Private helpers ───────────────────────────────────────────────

  /**
   * processAsync
   * Runs transcription → summarisation sequentially.
   * Updates meeting status at each stage so the client can poll.
   */
  private async processAsync(meetingId: string, blobName: string): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });
    if (!meeting) return;

    const { filePath, cleanup } =
      await this.blobStorageService.downloadToTempFile(blobName);

    try {
      // ── 1. Mark as processing ────────────────────────────────────
      await this.updateStatus(meeting, MeetingStatus.PROCESSING);

      // ── 2. Transcribe ────────────────────────────────────────────
      const transcription = await this.transcriptionsService.transcribeAudio({
        filePath,
        originalFileName: meeting.originalFileName,
      });
      transcription.meeting = meeting;
      meeting.transcription = transcription;

      // ── 3. Summarise ─────────────────────────────────────────────
      const summary = await this.summariesService.summariseTranscript({
        transcript: transcription.text,
      });
      summary.meeting = meeting;
      meeting.summary = summary;

      // ── 4. Mark completed ────────────────────────────────────────
      await this.updateStatus(meeting, MeetingStatus.COMPLETED);

      this.logger.log(`Meeting ${meetingId} processing complete.`);
    } catch (error) {
      this.logger.error(`Processing failed for meeting ${meetingId}`, error);
      await this.updateStatus(
        meeting,
        MeetingStatus.FAILED,
        (error as Error).message,
      );
    } finally {
      await cleanup();
    }
  }

  private async updateStatus(
    meeting: Meeting,
    status: MeetingStatus,
    errorMessage?: string,
  ): Promise<void> {
    meeting.status = status;
    if (errorMessage) meeting.errorMessage = errorMessage;
    await this.meetingRepository.save(meeting);
  }

  /** Validates MIME type and file size before persisting anywhere */
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
      throw new BadRequestException(
        `File too large. Maximum size is 25 MB.`,
      );
    }
  }

  /** Creates a collision-safe filename while preserving the extension */
  private buildStoredFileName(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname).toLowerCase();
    return `${uuidv4()}${ext}`;
  }

  /** Maps a Meeting entity to the client-facing MeetingResponse */
  private toResponse(meeting: Meeting): MeetingResponse {
    let audioUrl: string | undefined;
    try {
      audioUrl = this.blobStorageService.getReadSasUrl(meeting.storedFileName);
    } catch (err) {
      this.logger.warn(
        `Unable to generate SAS URL for meeting ${meeting.id}: ${(err as Error).message}`,
      );
    }

    return {
      id: meeting.id,
      originalFileName: meeting.originalFileName,
      title: meeting.title ?? null,
      audioUrl,
      status: meeting.status,
      errorMessage: meeting.errorMessage ?? undefined,
      transcription: meeting.transcription
        ? this.transcriptionsService.toResponse(meeting.transcription)
        : undefined,
      summary: meeting.summary
        ? this.summariesService.toResponse(meeting.summary)
        : undefined,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }
}
