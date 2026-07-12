import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConfigType } from '@nestjs/config';
import { ExtractedItem } from './entities/extracted-item.entity';
import { ExtractedItemStatus } from './enums/extracted-item-status.enum';
import { UpdateExtractedItemDto } from './dto/update-extracted-item.dto';
import {
  ApproveExtractedItemResponse,
  ExtractedItemResponse,
} from './interfaces/extracted-item-response.interface';
import { MeetingsService } from '../meetings/meetings.service';
import { JiraService } from '../jira/jira.service';
import { JiraSendService } from '../jira/jira-send.service';
import { extractionConfiguration } from '../common/config/extraction.config';

@Injectable()
export class ExtractedItemsService {
  private readonly logger = new Logger(ExtractedItemsService.name);

  constructor(
    @InjectRepository(ExtractedItem)
    private readonly extractedItemRepository: Repository<ExtractedItem>,
    private readonly meetingsService: MeetingsService,
    private readonly jiraService: JiraService,
    private readonly jiraSendService: JiraSendService,
    @Inject(extractionConfiguration.KEY)
    private readonly extractionConfig: ConfigType<typeof extractionConfiguration>,
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

    if (dto.finalProjectKey !== undefined) {
      await this.assertValidProjectKey(dto.finalProjectKey);
      item.finalProjectKey = dto.finalProjectKey.trim();
    }

    if (dto.type !== undefined) {
      item.type = dto.type;
    }
    if (dto.title !== undefined) {
      item.title = dto.title;
    }
    if (dto.description !== undefined) {
      item.description = dto.description;
    }
    if (dto.priority !== undefined) {
      item.priority = dto.priority;
    }

    item.jiraSyncError = null;
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
    const owned = await this.findOwnedItem(userId, itemId);
    const resolvedProjectKey = this.resolveProjectKey(owned);

    if (!resolvedProjectKey) {
      throw new BadRequestException(
        'No Jira project key resolved. Select a project before approving, or configure JIRA_PROJECT_KEY.',
      );
    }

    const claimResult = await this.extractedItemRepository.update(
      {
        id: itemId,
        status: ExtractedItemStatus.Draft,
        jiraIssueKey: IsNull(),
      },
      {
        status: ExtractedItemStatus.Approved,
        jiraSyncError: null,
        finalProjectKey: owned.finalProjectKey ?? resolvedProjectKey,
      },
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
      await this.jiraSendService.enqueueSend(itemId);
      this.logger.log(`Queued Jira send for extracted item ${itemId}`);
      return this.toResponse(item);
    } catch (error) {
      const message = (error as Error).message ?? String(error);
      this.logger.error(
        `Failed to queue Jira send for extracted item ${itemId}: ${message}`,
      );
      return this.revertToDraftWithError(item, message);
    }
  }

  private resolveProjectKey(item: ExtractedItem): string | null {
    const key =
      item.finalProjectKey?.trim() ||
      item.suggestedProjectKey?.trim() ||
      this.jiraService.getFallbackProjectKey();
    return key || null;
  }

  private async assertValidProjectKey(projectKey: string): Promise<void> {
    const normalized = projectKey.trim();
    if (!normalized) {
      throw new BadRequestException('Project key cannot be empty.');
    }

    if (!this.jiraService.isConfigured()) {
      const fallback = this.jiraService.getFallbackProjectKey();
      if (
        fallback &&
        fallback.toUpperCase() === normalized.toUpperCase()
      ) {
        return;
      }
      throw new BadRequestException(
        'Jira is not configured; cannot validate project keys.',
      );
    }

    const projects = await this.jiraService.listProjects();
    const exists = projects.some(
      (project) => project.key.toUpperCase() === normalized.toUpperCase(),
    );
    if (!exists) {
      throw new BadRequestException(
        `Unknown Jira project key "${projectKey}".`,
      );
    }
  }

  private async revertToDraftWithError(
    item: ExtractedItem,
    message: string,
  ): Promise<ApproveExtractedItemResponse> {
    item.status = ExtractedItemStatus.Draft;
    item.jiraIssueKey = null;
    item.jiraSyncError = message;
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
    const projectConfidence = item.projectConfidence;
    const extractionConfidence = item.extractionConfidence;

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
      jiraSyncError: item.jiraSyncError,
      suggestedProjectKey: item.suggestedProjectKey,
      projectConfidence,
      extractionConfidence,
      finalProjectKey: item.finalProjectKey,
      needsProjectReview:
        projectConfidence === null ||
        projectConfidence < this.extractionConfig.projectConfidenceThreshold,
      lowExtractionConfidence:
        extractionConfidence === null ||
        extractionConfidence <
          this.extractionConfig.extractionConfidenceThreshold,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
