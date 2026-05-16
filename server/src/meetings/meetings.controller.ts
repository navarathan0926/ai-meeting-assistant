import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingsService } from './meetings.service';
import { MeetingResponse } from './interfaces/meeting-response.interface';
import type { Express } from 'express';

/**
 * MeetingsController
 * Thin HTTP layer — its only jobs are:
 *  1. Bind routes and HTTP methods.
 *  2. Extract/parse request data (file, params, body).
 *  3. Delegate all work to MeetingsService.
 *  4. Return the service result (TransformInterceptor handles the envelope).
 *
 * No business logic, no validation beyond what decorators provide.
 */
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  /**
   * POST /api/meetings/upload
   * Accepts a single audio file via multipart/form-data (field name: "audio").
   * Returns immediately with a PENDING meeting record; processing happens async.
   */
  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED) // 202 — work started, not yet done
  @UseInterceptors(
    FileInterceptor('audio', {
      // Keep file in memory (buffer) — MeetingsService writes to disk
      // after validation so we don't litter the disk with invalid files.
      storage: undefined, // defaults to memoryStorage
      limits: { fileSize: 25 * 1024 * 1024 }, // guard at the HTTP layer too
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MeetingResponse> {
    return this.meetingsService.createFromUpload(file);
  }

  /**
   * GET /api/meetings
   * Returns all meetings ordered by creation date (newest first).
   * Used by the client to show a meeting history list.
   */
  @Get()
  async findAll(): Promise<MeetingResponse[]> {
    return this.meetingsService.findAll();
  }

  /**
   * GET /api/meetings/:id
   * Returns a single meeting with its transcription and summary.
   * The client polls this endpoint until status === 'completed' | 'failed'.
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MeetingResponse> {
    return this.meetingsService.findOne(id);
  }
}
