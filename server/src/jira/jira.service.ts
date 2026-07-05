import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ExtractedItemType } from '../extracted-items/enums/extracted-item-type.enum';
import { ExtractedItemPriority } from '../extracted-items/enums/extracted-item-priority.enum';
import {
  isJiraConfigured,
  jiraConfiguration,
  JiraConfig,
  requireJiraApiGatewayUrl,
  requireJiraCredentials,
} from '../common/config/jira.config';
import { normalizeBaseUrl } from '../common/config/env.helpers';
import { isValidAdfDocument } from '../common/jira-document/blocks-to-adf';
import { JiraAdfDocument } from '../common/jira-document/jira-document.types';

export interface JiraCreateIssueInput {
  type: ExtractedItemType;
  title: string;
  description: JiraAdfDocument;
  priority: ExtractedItemPriority;
}

export interface JiraCreateIssueResult {
  issueKey: string;
  issueId: string;
}

interface JiraCreateIssueResponse {
  id: string;
  key: string;
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private readonly config: JiraConfig;

  constructor(
    @Inject(jiraConfiguration.KEY)
    jiraConfig: ConfigType<typeof jiraConfiguration>,
  ) {
    this.config = jiraConfig;
  }

  isConfigured(): boolean {
    return isJiraConfigured(this.config);
  }

  getIssueBrowseUrl(issueKey: string): string | null {
    if (!this.config.baseUrl) {
      return null;
    }

    return `${normalizeBaseUrl(this.config.baseUrl)}/browse/${issueKey}`;
  }

  async createIssue(input: JiraCreateIssueInput): Promise<JiraCreateIssueResult> {
    const { cloudId, apiKey, email, projectKey } = requireJiraCredentials(
      this.config,
    );

    const url = this.buildRestUrl('/rest/api/3/issue', cloudId);
    const auth = Buffer.from(`${email}:${apiKey}`).toString('base64');
    const description = this.assertValidAdf(input.description);

    const body = {
      fields: {
        project: { key: projectKey },
        summary: input.title,
        description,
        issuetype: { name: this.mapIssueType(input.type) },
        priority: { name: this.mapPriority(input.priority) },
      },
    };

    this.logger.log(
      `Creating Jira issue in project ${projectKey}: "${input.title}"`,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Jira issue creation failed (${response.status}): ${errorBody}`,
      );
      throw new InternalServerErrorException(
        `Failed to create Jira issue: ${this.extractErrorMessage(errorBody)}`,
      );
    }

    const data = (await response.json()) as JiraCreateIssueResponse;
    this.logger.log(`Jira issue created: ${data.key}`);

    return { issueKey: data.key, issueId: data.id };
  }

  assertValidAdf(description: JiraAdfDocument): JiraAdfDocument {
    if (!isValidAdfDocument(description)) {
      throw new InternalServerErrorException(
        'Invalid Jira document format for issue description.',
      );
    }
    return description;
  }

  private buildRestUrl(path: string, cloudId: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${requireJiraApiGatewayUrl(this.config)}/${cloudId}${normalizedPath}`;
  }

  private mapIssueType(type: ExtractedItemType): string {
    const typeMap: Record<ExtractedItemType, string> = {
      [ExtractedItemType.Bug]: 'Bug',
      [ExtractedItemType.Task]: 'Task',
      [ExtractedItemType.Story]: 'Story',
      [ExtractedItemType.Feature]: 'Story',
    };
    return typeMap[type];
  }

  private mapPriority(priority: ExtractedItemPriority): string {
    const priorityMap: Record<ExtractedItemPriority, string> = {
      [ExtractedItemPriority.Low]: 'Low',
      [ExtractedItemPriority.Medium]: 'Medium',
      [ExtractedItemPriority.High]: 'High',
    };
    return priorityMap[priority];
  }

  private extractErrorMessage(errorBody: string): string {
    try {
      const parsed = JSON.parse(errorBody) as {
        errorMessages?: string[];
        errors?: Record<string, string>;
      };
      if (parsed.errorMessages?.length) {
        return parsed.errorMessages.join('; ');
      }
      if (parsed.errors) {
        return Object.values(parsed.errors).join('; ');
      }
    } catch {
      // fall through
    }
    return errorBody.slice(0, 200) || 'Unknown Jira error';
  }
}
