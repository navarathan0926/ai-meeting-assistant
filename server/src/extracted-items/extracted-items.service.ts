import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ExtractedItem } from './entities/extracted-item.entity';
import { ExtractedItemStatus } from './enums/extracted-item-status.enum';
import { UpdateExtractedItemDto } from './dto/update-extracted-item.dto';
import {
  ApproveExtractedItemResponse,
  ExtractedItemResponse,
} from './interfaces/extracted-item-response.interface';
import { MeetingsService } from '../meetings/meetings.service';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class ExtractedItemsService {
  private readonly logger = new Logger(ExtractedItemsService.name);

  constructor(
    @InjectRepository(ExtractedItem)
    private readonly extractedItemRepository: Repository<ExtractedItem>,
    private readonly meetingsService: MeetingsService,
    private readonly jiraService: JiraService,
  ) {}

  async findByMeeting(
    userId: string,
    meetingId: string,
  ): Promise<ExtractedItemResponse[]> {
    await this.meetingsService.assertOwned(userId, meetingId);

    const items = await this.extractedItemRepository.find({
      where: { meetingId },
      order: { createdAt: 'ASC' },
    });

    return items.map((item) => this.toResponse(item));
  }

  async updateDraft(
    userId: string,
    itemId: string,
    dto: UpdateExtractedItemDto,
  ): Promise<ExtractedItemResponse> {
    const item = await this.findOwnedItem(userId, itemId);

    if (item.status !== ExtractedItemStatus.Draft) {
      throw new BadRequestException('Only draft items can be edited.');
    }

    Object.assign(item, dto);
    const saved = await this.extractedItemRepository.save(item);
    return this.toResponse(saved);
  }

  async reject(userId: string, itemId: string): Promise<ExtractedItemResponse> {
    const item = await this.findOwnedItem(userId, itemId);

    if (item.status !== ExtractedItemStatus.Draft) {
      throw new BadRequestException(
        `Only draft items can be rejected. Current status: "${item.status}".`,
      );
    }

    item.status = ExtractedItemStatus.Rejected;
    const saved = await this.extractedItemRepository.save(item);
    return this.toResponse(saved);
  }

  async approve(
    userId: string,
    itemId: string,
  ): Promise<ApproveExtractedItemResponse> {
    await this.findOwnedItem(userId, itemId);

    const claimResult = await this.extractedItemRepository.update(
      {
        id: itemId,
        status: ExtractedItemStatus.Draft,
        jiraIssueKey: IsNull(),
      },
      { status: ExtractedItemStatus.Approved },
    );

    if (claimResult.affected === 0) {
      const current = await this.extractedItemRepository.findOne({
        where: { id: itemId },
      });

      if (!current) {
        throw new NotFoundException(
          `Extracted item with id "${itemId}" not found.`,
        );
      }

      if (current.status === ExtractedItemStatus.Sent) {
        return this.toResponse(current);
      }

      if (current.status === ExtractedItemStatus.Rejected) {
        throw new BadRequestException('Rejected items cannot be approved.');
      }

      if (current.status === ExtractedItemStatus.Approved) {
        throw new ConflictException(
          'This item is already being sent to Jira. Please wait and try again.',
        );
      }

      throw new BadRequestException(
        `Item cannot be approved while in "${current.status}" status.`,
      );
    }

    const item = await this.extractedItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Extracted item with id "${itemId}" not found.`,
      );
    }

    if (!this.jiraService.isConfigured()) {
      return this.revertToDraftWithError(
        item,
        'Jira integration is not configured.',
      );
    }

    try {
      const result = await this.jiraService.createIssue({
        type: item.type,
        title: item.title,
        description: item.description,
        priority: item.priority,
      });

      item.jiraIssueKey = result.issueKey;
      item.status = ExtractedItemStatus.Sent;
      const saved = await this.extractedItemRepository.save(item);
      return this.toResponse(saved);
    } catch (error) {
      const message = (error as Error).message ?? String(error);
      this.logger.error(
        `Jira creation failed for extracted item ${itemId}: ${message}`,
      );
      return this.revertToDraftWithError(item, message);
    }
  }

  private async revertToDraftWithError(
    item: ExtractedItem,
    message: string,
  ): Promise<ApproveExtractedItemResponse> {
    item.status = ExtractedItemStatus.Draft;
    item.jiraIssueKey = null;
    const saved = await this.extractedItemRepository.save(item);
    return {
      ...this.toResponse(saved),
      jiraError: message,
    };
  }

  private async findOwnedItem(
    userId: string,
    itemId: string,
  ): Promise<ExtractedItem> {
    const item = await this.extractedItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Extracted item with id "${itemId}" not found.`,
      );
    }

    await this.meetingsService.assertOwned(userId, item.meetingId);
    return item;
  }

  private toResponse(item: ExtractedItem): ExtractedItemResponse {
    return {
      id: item.id,
      meetingId: item.meetingId,
      type: item.type,
      title: item.title,
      description: item.description,
      priority: item.priority,
      contextSnippet: item.contextSnippet,
      status: item.status,
      jiraIssueKey: item.jiraIssueKey,
      jiraIssueUrl: item.jiraIssueKey
        ? this.jiraService.getIssueBrowseUrl(item.jiraIssueKey)
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
