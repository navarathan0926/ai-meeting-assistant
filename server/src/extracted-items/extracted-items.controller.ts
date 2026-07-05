import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { ExtractedItemsService } from './extracted-items.service';
import { UpdateExtractedItemDto } from './dto/update-extracted-item.dto';
import {
  ApproveExtractedItemResponse,
  ExtractedItemResponse,
} from './interfaces/extracted-item-response.interface';

@Auth()
@Controller('extracted-items')
export class ExtractedItemsController {
  constructor(private readonly extractedItemsService: ExtractedItemsService) {}

  @Get('meeting/:meetingId')
  async listByMeeting(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ): Promise<ExtractedItemResponse[]> {
    return this.extractedItemsService.findByMeeting(user.id, meetingId);
  }

  @Patch(':id')
  async updateDraft(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExtractedItemDto,
  ): Promise<ExtractedItemResponse> {
    return this.extractedItemsService.updateDraft(user.id, id, dto);
  }

  @Patch(':id/reject')
  async reject(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExtractedItemResponse> {
    return this.extractedItemsService.reject(user.id, id);
  }

  @Post(':id/approve')
  async approve(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApproveExtractedItemResponse> {
    return this.extractedItemsService.approve(user.id, id);
  }
}
