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
import {
  buildPaginatedResponse,
  PaginatedResponse,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { OrgScoped } from '../organizations/decorators/organization-scope.decorator';
import type { Express } from 'express';

@Auth()
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

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
    return this.meetingsService.createFromUpload(file, user);
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<MeetingResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.meetingsService.findAll(user, {
      page,
      limit,
      search: query.search,
    });

    return buildPaginatedResponse(items, total, page, limit);
  }

  @OrgScoped({ resource: 'meeting', param: 'id' })
  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MeetingResponse> {
    return this.meetingsService.findOne(user, id);
  }

  @OrgScoped({ resource: 'meeting', param: 'id' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.meetingsService.deleteMeeting(user, id);
  }
}
