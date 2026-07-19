import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { ConfigType } from '@nestjs/config';
import { openAiConfiguration } from '../common/config/openai.config';
import { extractionConfiguration } from '../common/config/extraction.config';
import { Meeting } from '../meetings/entities/meeting.entity';
import { ExtractionAnalysis } from '../meetings/interfaces/extraction-analysis.interface';
import { ExtractedItem } from './entities/extracted-item.entity';
import { ExtractedItemType } from './enums/extracted-item-type.enum';
import { ExtractedItemPriority } from './enums/extracted-item-priority.enum';
import { ExtractedItemStatus } from './enums/extracted-item-status.enum';
import {
  consolidateExtractedItems,
  ITEM_EXTRACTION_JSON_SCHEMA,
  ItemExtractionOutput,
  RawMeetingAnalysis,
} from './item-extraction.schema';
import { rawBlocksToAdf } from '../common/jira-document/merge-jira-documents';
import {
  buildItemExtractionUserPrompt,
  ExtractionProjectContext,
  ITEM_EXTRACTION_SYSTEM_PROMPT,
} from './item-extraction.prompt';
import { JiraService } from '../jira/jira.service';
import { buildExtractionAnalysisFlags } from '../meetings/extraction-analysis.util';

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
    @Inject(extractionConfiguration.KEY)
    private readonly extractionConfig: ConfigType<typeof extractionConfiguration>,
    private readonly jiraService: JiraService,
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

    if (meeting.extractionAnalysis) {
      this.logger.log(
        `Meeting ${meetingId} already has extraction analysis — skipping duplicate extraction.`,
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

    const projects = await this.jiraService.getProjectsForExtraction();

    const extraction = await this.extractItemsFromContent(
      meeting.transcription.text,
      meeting.summary?.overview,
      meeting.summary?.actionItems,
      projects,
    );

    const analysis = this.toExtractionAnalysis(extraction.meeting_analysis);
    const rawItems =
      analysis.hasActionableWork === false
        ? []
        : consolidateExtractedItems(extraction.items);

    this.logger.log(
      `Consolidated ${extraction.items.length} raw extraction(s) → ${rawItems.length} Jira card(s) for meeting ${meetingId}.`,
    );

    if (rawItems.length === 0) {
      meeting.extractionAnalysis = analysis;
      await this.meetingRepository.save(meeting);
      this.logger.log(
        `No actionable items found for meeting ${meetingId}: ${analysis.summary}`,
      );
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

    const entities = rawItems.map((item) => {
      const suggestedProjectKey = this.resolveSuggestedProjectKey(
        item.suggested_project_key,
        projects,
      );

      return this.extractedItemRepository.create({
        meetingId,
        organizationId: meeting.organizationId,
        type: this.parseType(item.type),
        title: item.title.trim(),
        description: rawBlocksToAdf(item.description_blocks),
        priority: this.parsePriority(item.priority),
        contextSnippet: item.context_snippet?.trim() || null,
        status: ExtractedItemStatus.Draft,
        suggestedProjectKey,
        projectConfidence: this.clampConfidence(item.project_confidence),
        extractionConfidence: this.clampConfidence(item.extraction_confidence),
        finalProjectKey: null,
      });
    });

    await this.extractedItemRepository.save(entities);
    meeting.extractionAnalysis = analysis;
    await this.meetingRepository.save(meeting);
    this.logger.log(
      `Saved ${entities.length} extracted item(s) for meeting ${meetingId}.`,
    );
  }

  private async extractItemsFromContent(
    transcript: string,
    summaryOverview: string | undefined,
    actionItems: string[] | undefined,
    projects: ExtractionProjectContext[],
  ): Promise<ItemExtractionOutput> {
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
            projects,
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
    if (!parsed.meeting_analysis || !Array.isArray(parsed.items)) {
      throw new Error(
        'Extraction response does not match expected schema.',
      );
    }

    if (completion.usage) {
      this.logger.log(
        `OpenAI extraction tokens — prompt: ${completion.usage.prompt_tokens}, completion: ${completion.usage.completion_tokens}`,
      );
    }

    return parsed;
  }

  private toExtractionAnalysis(
    analysis: RawMeetingAnalysis,
  ): ExtractionAnalysis {
    const hasActionableWork = Boolean(analysis.has_actionable_work);
    const projectRelevanceConfidence = this.clampConfidence(
      analysis.project_relevance_confidence,
    );
    const meetingRelevanceThreshold =
      this.extractionConfig.meetingRelevanceThreshold;
    const flags = buildExtractionAnalysisFlags(
      { hasActionableWork, projectRelevanceConfidence },
      meetingRelevanceThreshold,
    );

    return {
      hasActionableWork,
      projectRelevanceConfidence,
      summary: analysis.summary?.trim() || 'No extraction summary provided.',
      extractedAt: new Date().toISOString(),
      meetingRelevanceThreshold,
      ...flags,
    };
  }

  private resolveSuggestedProjectKey(
    rawKey: string | undefined,
    projects: ExtractionProjectContext[],
  ): string | null {
    const key = rawKey?.trim();
    if (!key) {
      return null;
    }
    if (projects.length === 0) {
      return key;
    }
    const match = projects.find(
      (project) => project.key.toUpperCase() === key.toUpperCase(),
    );
    if (!match) {
      this.logger.warn(
        `Model suggested unknown project key "${key}" — clearing suggestion.`,
      );
      return null;
    }
    return match.key;
  }

  private clampConfidence(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.min(1, Math.max(0, value));
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
