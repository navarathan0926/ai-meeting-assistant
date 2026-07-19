import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { ExtractedItemType } from '../extracted-items/enums/extracted-item-type.enum';
import { ExtractedItemPriority } from '../extracted-items/enums/extracted-item-priority.enum';
import {
  jiraConfiguration,
  JiraConfig,
  requireJiraApiGatewayUrl,
} from '../common/config/jira.config';
import { normalizeBaseUrl } from '../common/config/env.helpers';
import { isValidAdfDocument } from '../common/jira-document/blocks-to-adf';
import { JiraAdfDocument } from '../common/jira-document/jira-document.types';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import { ProjectContext } from './entities/project-context.entity';
import { OrganizationJiraService } from '../organizations/organization-jira.service';
import { ResolvedJiraCredentials } from '../organizations/interfaces/organization-jira.interface';

export interface JiraCreateIssueInput {
  type: ExtractedItemType;
  title: string;
  description: JiraAdfDocument;
  priority: ExtractedItemPriority;
  projectKey?: string;
}

export interface JiraCreateIssueResult {
  issueKey: string;
  issueId: string;
}

export interface JiraProjectSummary {
  key: string;
  name: string;
  description: string;
  aiContext: string;
}

interface JiraCreateIssueResponse {
  id: string;
  key: string;
}

interface JiraProjectSearchResponse {
  values?: Array<{
    key?: string;
    name?: string;
    description?: string;
  }>;
}

interface JiraCreateMetaResponse {
  projects?: Array<{
    key?: string;
    issuetypes?: Array<{ name?: string }>;
  }>;
}

const CREATEMETA_CACHE_PREFIX = 'jira:createmeta:';
const CREATEMETA_TTL_SECONDS = 30 * 60;

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private readonly config: JiraConfig;

  constructor(
    @Inject(jiraConfiguration.KEY)
    jiraConfig: ConfigType<typeof jiraConfiguration>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(ProjectContext)
    private readonly projectContextRepository: Repository<ProjectContext>,
    private readonly organizationJiraService: OrganizationJiraService,
  ) {
    this.config = jiraConfig;
  }

  async isConfigured(organizationId: string): Promise<boolean> {
    return this.organizationJiraService.isConfigured(organizationId);
  }

  getFallbackProjectKey(): string | null {
    const key = this.config.projectKey?.trim();
    return key || null;
  }

  async getIssueBrowseUrl(
    issueKey: string,
    _organizationId?: string,
  ): Promise<string | null> {
    if (!this.config.baseUrl) {
      return null;
    }
    return `${normalizeBaseUrl(this.config.baseUrl)}/browse/${issueKey}`;
  }

  async listProjects(
    organizationId: string,
    options?: { bypassCache?: boolean },
  ): Promise<JiraProjectSummary[]> {
    const credentials =
      await this.organizationJiraService.resolveForOrganization(organizationId);
    if (!credentials) {
      throw new BadRequestException('Jira integration is not configured.');
    }

    const cacheKey = this.projectsCacheKey(organizationId);
    if (!options?.bypassCache) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as JiraProjectSummary[];
          return this.mergeAiContexts(organizationId, parsed);
        } catch {
          await this.redis.del(cacheKey);
        }
      }
    }

    const projects = await this.fetchProjectsFromJira(credentials);
    await this.redis.setex(
      cacheKey,
      this.config.projectsCacheTtlSeconds,
      JSON.stringify(projects),
    );

    return this.mergeAiContexts(organizationId, projects);
  }

  async invalidateProjectsCache(organizationId: string): Promise<void> {
    await this.redis.del(this.projectsCacheKey(organizationId));
  }

  async upsertProjectContext(
    organizationId: string,
    projectKey: string,
    aiContext: string,
  ): Promise<JiraProjectSummary> {
    const normalizedKey = projectKey.trim().toUpperCase();
    if (!normalizedKey) {
      throw new BadRequestException('Project key is required.');
    }

    const projects = await this.listProjects(organizationId);
    const match = projects.find(
      (project) => project.key.toUpperCase() === normalizedKey,
    );
    if (!match) {
      throw new BadRequestException(
        `Unknown Jira project key "${projectKey}". Refresh the project list and try again.`,
      );
    }

    await this.projectContextRepository.save({
      organizationId,
      projectKey: match.key,
      aiContext: aiContext.trim(),
    });

    return {
      ...match,
      aiContext: aiContext.trim(),
    };
  }

  async getProjectsForExtraction(
    organizationId: string,
  ): Promise<Array<{ key: string; name: string; aiContext: string }>> {
    const configured =
      await this.organizationJiraService.isConfigured(organizationId);
    if (!configured) {
      const fallback = this.getFallbackProjectKey();
      if (!fallback) {
        return [];
      }
      return [{ key: fallback, name: fallback, aiContext: fallback }];
    }

    try {
      const projects = await this.listProjects(organizationId);
      return projects.map((project) => ({
        key: project.key,
        name: project.name,
        aiContext: project.aiContext || project.description || project.name,
      }));
    } catch (error) {
      this.logger.warn(
        `Failed to load Jira projects for extraction (org ${organizationId}): ${(error as Error).message}`,
      );
      const fallback = this.getFallbackProjectKey();
      if (!fallback) {
        return [];
      }
      return [{ key: fallback, name: fallback, aiContext: fallback }];
    }
  }

  async createIssue(
    organizationId: string,
    input: JiraCreateIssueInput,
  ): Promise<JiraCreateIssueResult> {
    const credentials =
      await this.organizationJiraService.resolveForOrganization(organizationId);
    if (!credentials) {
      throw new BadRequestException('Jira integration is not configured.');
    }

    const projectKey = (
      input.projectKey?.trim() ||
      this.getFallbackProjectKey() ||
      ''
    ).trim();
    if (!projectKey) {
      throw new BadRequestException(
        'No Jira project key resolved. Set a project on the item or configure JIRA_PROJECT_KEY.',
      );
    }

    const issueTypeName = await this.resolveIssueTypeName(
      organizationId,
      projectKey,
      input.type,
      credentials,
    );

    const url = this.buildRestUrl('/rest/api/3/issue', credentials.cloudId);
    const auth = this.buildBasicAuth(credentials);
    const description = this.assertValidAdf(input.description);

    const body = {
      fields: {
        project: { key: projectKey },
        summary: input.title,
        description,
        issuetype: { name: issueTypeName },
        priority: { name: this.mapPriority(input.priority) },
      },
    };

    this.logger.log(
      `Creating Jira issue in project ${projectKey} (org ${organizationId}): "${input.title}" (${issueTypeName})`,
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
        `Jira issue creation failed for org ${organizationId} (${response.status}): ${errorBody}`,
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

  private projectsCacheKey(organizationId: string): string {
    return `jira:projects:${organizationId}:v1`;
  }

  private buildBasicAuth(credentials: ResolvedJiraCredentials): string {
    return Buffer.from(`${credentials.email}:${credentials.apiKey}`).toString(
      'base64',
    );
  }

  private async fetchProjectsFromJira(
    credentials: ResolvedJiraCredentials,
  ): Promise<
    Array<{ key: string; name: string; description: string; aiContext: string }>
  > {
    const url = this.buildRestUrl(
      '/rest/api/3/project/search?maxResults=50',
      credentials.cloudId,
    );
    const auth = this.buildBasicAuth(credentials);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Jira project search failed for org ${credentials.organizationId} (${response.status}): ${errorBody}`,
      );
      throw new InternalServerErrorException(
        `Failed to list Jira projects: ${this.extractErrorMessage(errorBody)}`,
      );
    }

    const data = (await response.json()) as JiraProjectSearchResponse;
    const projects = (data.values ?? [])
      .filter((project) => Boolean(project.key && project.name))
      .map((project) => ({
        key: project.key as string,
        name: project.name as string,
        description: project.description?.trim() ?? '',
        aiContext: '',
      }));

    this.logger.log(
      `Fetched ${projects.length} Jira project(s) for org ${credentials.organizationId}.`,
    );
    return projects;
  }

  private async mergeAiContexts(
    organizationId: string,
    projects: Array<{
      key: string;
      name: string;
      description: string;
      aiContext: string;
    }>,
  ): Promise<JiraProjectSummary[]> {
    if (projects.length === 0) {
      return [];
    }

    const contexts = await this.projectContextRepository.find({
      where: { organizationId },
    });
    const contextByKey = new Map(
      contexts.map((entry) => [entry.projectKey.toUpperCase(), entry.aiContext]),
    );

    return projects.map((project) => {
      const stored = contextByKey.get(project.key.toUpperCase());
      const aiContext =
        stored?.trim() ||
        project.description?.trim() ||
        project.name;
      return {
        key: project.key,
        name: project.name,
        description: project.description ?? '',
        aiContext,
      };
    });
  }

  private async resolveIssueTypeName(
    organizationId: string,
    projectKey: string,
    type: ExtractedItemType,
    credentials: ResolvedJiraCredentials,
  ): Promise<string> {
    const preferred = this.mapIssueType(type);
    const available = await this.getCreateMetaIssueTypes(
      organizationId,
      projectKey,
      credentials,
    );

    if (available.length === 0) {
      this.logger.warn(
        `No createmeta issue types for project ${projectKey}; using preferred "${preferred}".`,
      );
      return preferred;
    }

    const exact = available.find(
      (name) => name.toLowerCase() === preferred.toLowerCase(),
    );
    if (exact) {
      return exact;
    }

    const fallbackOrder = this.issueTypeFallbackOrder(preferred);
    for (const candidate of fallbackOrder) {
      const match = available.find(
        (name) => name.toLowerCase() === candidate.toLowerCase(),
      );
      if (match) {
        this.logger.warn(
          `Issue type "${preferred}" missing in ${projectKey}; falling back to "${match}".`,
        );
        return match;
      }
    }

    this.logger.warn(
      `No preferred issue types found in ${projectKey}; using first available "${available[0]}".`,
    );
    return available[0];
  }

  private async getCreateMetaIssueTypes(
    organizationId: string,
    projectKey: string,
    credentials: ResolvedJiraCredentials,
  ): Promise<string[]> {
    const cacheKey = `${CREATEMETA_CACHE_PREFIX}${organizationId}:${projectKey.toUpperCase()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as string[];
      } catch {
        await this.redis.del(cacheKey);
      }
    }

    const path = `/rest/api/3/issue/createmeta?projectKeys=${encodeURIComponent(projectKey)}&expand=projects.issuetypes.fields`;
    const url = this.buildRestUrl(path, credentials.cloudId);
    const auth = this.buildBasicAuth(credentials);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.warn(
        `createmeta failed for ${projectKey} (${response.status}): ${errorBody}`,
      );
      return [];
    }

    const data = (await response.json()) as JiraCreateMetaResponse;
    const project = data.projects?.find(
      (entry) => entry.key?.toUpperCase() === projectKey.toUpperCase(),
    );
    const names = (project?.issuetypes ?? [])
      .map((issueType) => issueType.name?.trim())
      .filter((name): name is string => Boolean(name));

    await this.redis.setex(
      cacheKey,
      CREATEMETA_TTL_SECONDS,
      JSON.stringify(names),
    );

    return names;
  }

  private issueTypeFallbackOrder(preferred: string): string[] {
    const order = ['Bug', 'Task', 'Story', 'Sub-task', 'Epic'];
    return [preferred, ...order.filter((name) => name !== preferred)];
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
