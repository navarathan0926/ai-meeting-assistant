import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { MeetingsService } from './meetings.service';
import { MeetingResponse } from './interfaces/meeting-response.interface';
import { ExtractedItemsService } from '../extracted-items/extracted-items.service';
import { ExtractedItemResponse } from '../extracted-items/interfaces/extracted-item-response.interface';
import type { Express } from 'express';

@Auth()
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly extractedItemsService: ExtractedItemsService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: undefined,
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MeetingResponse> {
    return this.meetingsService.createFromUpload(file, user.id);
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('search') search?: string,
  ): Promise<MeetingResponse[]> {
    return this.meetingsService.findAll(user.id, search);
  }

  @Get(':id/extracted-items')
  async listExtractedItems(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExtractedItemResponse[]> {
    return this.extractedItemsService.findByMeeting(user.id, id);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MeetingResponse> {
    return this.meetingsService.findOne(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.meetingsService.deleteMeeting(user.id, id);
  }
}
