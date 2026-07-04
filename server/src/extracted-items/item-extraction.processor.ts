import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { ConfigType } from '@nestjs/config';
import { openAiConfiguration } from '../common/config/openai.config';
import { Meeting } from '../meetings/entities/meeting.entity';
import { ExtractedItem } from './entities/extracted-item.entity';
import { ExtractedItemType } from './enums/extracted-item-type.enum';
import { ExtractedItemPriority } from './enums/extracted-item-priority.enum';
import { ExtractedItemStatus } from './enums/extracted-item-status.enum';
import {
  consolidateExtractedItems,
  ITEM_EXTRACTION_JSON_SCHEMA,
  ItemExtractionOutput,
  RawExtractedItem,
} from './item-extraction.schema';
import {
  buildItemExtractionUserPrompt,
  ITEM_EXTRACTION_SYSTEM_PROMPT,
} from './item-extraction.prompt';

interface ItemExtractionJobData {
  meetingId: string;
}

@Processor('item-extraction', { concurrency: 2 })
export class ItemExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ItemExtractionProcessor.name);
  private readonly openai: OpenAI;
  private readonly extractionModel: string;

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(ExtractedItem)
    private readonly extractedItemRepository: Repository<ExtractedItem>,
    @Inject(openAiConfiguration.KEY)
    openAiConfig: ConfigType<typeof openAiConfiguration>,
  ) {
    super();
    this.extractionModel = openAiConfig.extractionModel;
    this.openai = new OpenAI({
      apiKey: openAiConfig.apiKey,
    });
  }

  async process(job: Job<ItemExtractionJobData>): Promise<void> {
    const { meetingId } = job.data;
    const attempt = job.attemptsMade + 1;

    this.logger.log(
      `Processing item extraction job [${job.id}] for meeting ${meetingId} (attempt ${attempt}/3)`,
    );

    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['transcription', 'summary'],
    });

    if (!meeting) {
      this.logger.warn(
        `Meeting ${meetingId} not found — item extraction job [${job.id}] discarded.`,
      );
      return;
    }

    if (!meeting.transcription?.text) {
      this.logger.warn(
        `Meeting ${meetingId} has no transcript — item extraction skipped.`,
      );
      return;
    }

    const existingCount = await this.extractedItemRepository.count({
      where: { meetingId },
    });
    if (existingCount > 0) {
      this.logger.log(
        `Meeting ${meetingId} already has extracted items — skipping duplicate extraction.`,
      );
      return;
    }

    const rawItems = await this.extractItemsFromContent(
      meeting.transcription.text,
      meeting.summary?.overview,
      meeting.summary?.actionItems,
    );

    const dedupedItems = consolidateExtractedItems(rawItems);

    this.logger.log(
      `Consolidated ${rawItems.length} raw extraction(s) → ${dedupedItems.length} Jira card(s) for meeting ${meetingId}.`,
    );

    if (dedupedItems.length === 0) {
      this.logger.log(`No actionable items found for meeting ${meetingId}.`);
      return;
    }

    const existingBeforeSave = await this.extractedItemRepository.count({
      where: { meetingId },
    });
    if (existingBeforeSave > 0) {
      this.logger.log(
        `Meeting ${meetingId} already has extracted items before save — skipping duplicate extraction.`,
      );
      return;
    }

    const entities = dedupedItems.map((item) =>
      this.extractedItemRepository.create({
        meetingId,
        type: this.parseType(item.type),
        title: item.title.trim(),
        description: item.description.trim(),
        priority: this.parsePriority(item.priority),
        contextSnippet: item.context_snippet?.trim() || null,
        status: ExtractedItemStatus.Draft,
      }),
    );

    await this.extractedItemRepository.save(entities);
    this.logger.log(
      `Saved ${entities.length} extracted item(s) for meeting ${meetingId}.`,
    );
  }

  private async extractItemsFromContent(
    transcript: string,
    summaryOverview?: string,
    actionItems?: string[],
  ): Promise<RawExtractedItem[]> {
    const completion = await this.openai.chat.completions.create({
      model: this.extractionModel,
      response_format: {
        type: 'json_schema',
        json_schema: ITEM_EXTRACTION_JSON_SCHEMA,
      },
      messages: [
        { role: 'system', content: ITEM_EXTRACTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildItemExtractionUserPrompt(
            transcript,
            summaryOverview,
            actionItems,
          ),
        },
      ],
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('OpenAI returned an empty extraction response.');
    }

    const parsed = JSON.parse(raw) as ItemExtractionOutput;
    if (!Array.isArray(parsed.items)) {
      throw new Error('OpenAI extraction response does not match expected schema.');
    }

    if (completion.usage) {
      this.logger.log(
        `OpenAI extraction tokens — prompt: ${completion.usage.prompt_tokens}, completion: ${completion.usage.completion_tokens}`,
      );
    }

    return parsed.items;
  }

  private parseType(value: string): ExtractedItemType {
    const allowed = Object.values(ExtractedItemType);
    if (!allowed.includes(value as ExtractedItemType)) {
      throw new Error(`Invalid extracted item type from OpenAI: "${value}"`);
    }
    return value as ExtractedItemType;
  }

  private parsePriority(value: string): ExtractedItemPriority {
    const allowed = Object.values(ExtractedItemPriority);
    if (!allowed.includes(value as ExtractedItemPriority)) {
      throw new Error(
        `Invalid extracted item priority from OpenAI: "${value}"`,
      );
    }
    return value as ExtractedItemPriority;
  }
}
