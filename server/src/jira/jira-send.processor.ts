import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractedItem } from '../extracted-items/entities/extracted-item.entity';
import { ExtractedItemStatus } from '../extracted-items/enums/extracted-item-status.enum';
import { JiraService } from './jira.service';

export interface JiraSendJobData {
  itemId: string;
}

@Processor('jira-send', { concurrency: 2 })
export class JiraSendProcessor extends WorkerHost {
  private readonly logger = new Logger(JiraSendProcessor.name);

  constructor(
    @InjectRepository(ExtractedItem)
    private readonly extractedItemRepository: Repository<ExtractedItem>,
    private readonly jiraService: JiraService,
  ) {
    super();
  }

  async process(job: Job<JiraSendJobData>): Promise<void> {
    const { itemId } = job.data;
    const item = await this.extractedItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      this.logger.warn(`Extracted item ${itemId} not found — job discarded.`);
      return;
    }

    if (item.status !== ExtractedItemStatus.Approved) {
      this.logger.warn(
        `Extracted item ${itemId} is "${item.status}" — job skipped.`,
      );
      return;
    }

    if (!this.jiraService.isConfigured()) {
      await this.revertToDraft(item, 'Jira integration is not configured.');
      return;
    }

    try {
      const result = await this.jiraService.createIssue({
        type: item.type,
        title: item.title,
        description: item.description,
        priority: item.priority,
        projectKey:
          item.finalProjectKey ??
          item.suggestedProjectKey ??
          undefined,
      });

      item.jiraIssueKey = result.issueKey;
      item.status = ExtractedItemStatus.Sent;
      if (!item.finalProjectKey) {
        item.finalProjectKey =
          item.suggestedProjectKey ??
          this.jiraService.getFallbackProjectKey();
      }
      await this.extractedItemRepository.save(item);
      this.logger.log(`Jira issue ${result.issueKey} created for item ${itemId}`);
    } catch (error) {
      const message = (error as Error).message ?? String(error);
      this.logger.error(
        `Jira creation failed for extracted item ${itemId}: ${message}`,
      );
      await this.revertToDraft(item, message);
    }
  }

  private async revertToDraft(
    item: ExtractedItem,
    message: string,
  ): Promise<void> {
    item.status = ExtractedItemStatus.Draft;
    item.jiraIssueKey = null;
    item.jiraSyncError = message;
    await this.extractedItemRepository.save(item);
  }
}
