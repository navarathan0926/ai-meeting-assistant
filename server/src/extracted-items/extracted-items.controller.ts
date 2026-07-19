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
import { RequireRoles } from '../common/decorators/require-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { ExtractedItemsService } from './extracted-items.service';
import { UpdateExtractedItemDto } from './dto/update-extracted-item.dto';
import { OrgScoped } from '../organizations/decorators/organization-scope.decorator';
import {
  ApproveExtractedItemResponse,
  ExtractedItemResponse,
} from './interfaces/extracted-item-response.interface';

@Auth()
@Controller('extracted-items')
export class ExtractedItemsController {
  constructor(private readonly extractedItemsService: ExtractedItemsService) {}

  @OrgScoped({ resource: 'meeting', param: 'meetingId' })
  @Get('meeting/:meetingId')
  async listByMeeting(
    @CurrentUser() user: User,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ): Promise<ExtractedItemResponse[]> {
    return this.extractedItemsService.findByMeeting(user, meetingId);
  }

  @OrgScoped({ resource: 'extracted-item', param: 'id' })
  @Patch(':id')
  async updateDraft(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExtractedItemDto,
  ): Promise<ExtractedItemResponse> {
    return this.extractedItemsService.updateDraft(user, id, dto);
  }

  @OrgScoped({ resource: 'extracted-item', param: 'id' })
  @Patch(':id/reject')
  async reject(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExtractedItemResponse> {
    return this.extractedItemsService.reject(user, id);
  }

  @OrgScoped({ resource: 'extracted-item', param: 'id' })
  @RequireRoles(UserRole.Admin)
  @Post(':id/approve')
  async approve(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApproveExtractedItemResponse> {
    return this.extractedItemsService.approve(user, id);
  }
}

