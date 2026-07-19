import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import {
  encryptionConfiguration,
  requireEncryptionKey,
} from '../common/config/encryption.config';
import {
  buildJiraConfig,
  isJiraConfigured,
  jiraConfiguration,
  requireJiraApiGatewayUrl,
} from '../common/config/jira.config';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import { encrypt, decrypt } from '../common/utils/crypto.util';
import { DEFAULT_ORGANIZATION_ID } from './organizations.constants';
import { Organization } from './entities/organization.entity';
import { UpdateJiraConfigDto } from './dto/update-jira-config.dto';
import {
  JiraConfigResponse,
  ResolvedJiraCredentials,
} from './interfaces/organization-jira.interface';
import { JiraAuthType } from './enums/jira-auth-type.enum';
import { EnvKey } from '../common/config/env.keys';

interface JiraMyselfResponse {
  accountId?: string;
}

const JIRA_PROJECTS_CACHE_PREFIX = 'jira:projects:';

@Injectable()
export class OrganizationJiraService {
  private readonly logger = new Logger(OrganizationJiraService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @Inject(encryptionConfiguration.KEY)
    private readonly encryptionConfig: ConfigType<typeof encryptionConfiguration>,
    @Inject(jiraConfiguration.KEY)
    private readonly jiraConfig: ConfigType<typeof jiraConfiguration>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getConfig(organizationId: string): Promise<JiraConfigResponse> {
    const org = await this.findOrganizationOrThrow(organizationId);
    const configured = await this.isConfigured(organizationId);
    return this.toConfigResponse(org, configured);
  }

  async updateConfig(
    organizationId: string,
    dto: UpdateJiraConfigDto,
  ): Promise<JiraConfigResponse> {
    const org = await this.loadOrganizationWithCredentials(organizationId);
    const encryptionKey = requireEncryptionKey(this.encryptionConfig);

    const cloudId = dto.jiraCloudId.trim();
    const email = dto.jiraEmail.trim();
    const tokenInput = dto.jiraApiToken?.trim();

    let encryptedToken = org.jiraApiToken;
    if (tokenInput) {
      encryptedToken = encrypt(tokenInput, encryptionKey);
    } else if (!encryptedToken) {
      throw new BadRequestException(
        'Jira API token is required when configuring Jira for the first time.',
      );
    }

    const plainToken = tokenInput ?? this.decryptStoredToken(org.jiraApiToken);
    const verified = await this.verifyCredentials({
      organizationId,
      cloudId,
      email,
      apiKey: plainToken,
      accountId: null,
    });

    org.jiraCloudId = cloudId;
    org.jiraEmail = email;
    org.jiraApiToken = encryptedToken;
    org.jiraAccountId = verified.accountId;
    org.jiraAuthType = JiraAuthType.ApiToken;

    await this.organizationRepository.save(org);
    await this.invalidateProjectsCache(organizationId);
    return this.toConfigResponse(org, true);
  }

  async testConfig(
    organizationId: string,
    dto?: UpdateJiraConfigDto,
  ): Promise<{ ok: true }> {
    const credentials = dto
      ? await this.resolveFromDto(organizationId, dto)
      : await this.resolveForOrganization(organizationId);

    if (!credentials) {
      throw new BadRequestException('Jira is not configured for this organization.');
    }

    await this.verifyCredentials(credentials);
    return { ok: true };
  }

  async resolveForOrganization(
    organizationId: string,
  ): Promise<ResolvedJiraCredentials | null> {
    const org = await this.loadOrganizationWithCredentials(organizationId);
    if (org.jiraEmail && org.jiraApiToken && org.jiraCloudId) {
      const apiKey = this.decryptStoredToken(org.jiraApiToken);
      return {
        organizationId,
        cloudId: org.jiraCloudId,
        email: org.jiraEmail,
        apiKey,
        accountId: org.jiraAccountId,
      };
    }

    if (organizationId === DEFAULT_ORGANIZATION_ID) {
      return this.resolveEnvFallback(organizationId);
    }

    return null;
  }

  isConfigured(organizationId: string): Promise<boolean> {
    return this.resolveForOrganization(organizationId).then(Boolean);
  }

  private async resolveFromDto(
    organizationId: string,
    dto: UpdateJiraConfigDto,
  ): Promise<ResolvedJiraCredentials> {
    const org = await this.loadOrganizationWithCredentials(organizationId);
    const cloudId = dto.jiraCloudId.trim();
    const email = dto.jiraEmail.trim();
    const tokenInput = dto.jiraApiToken?.trim();
    const apiKey =
      tokenInput ??
      (org.jiraApiToken
        ? this.decryptStoredToken(org.jiraApiToken)
        : null);

    if (!apiKey) {
      throw new BadRequestException('Jira API token is required to test credentials.');
    }

    return {
      organizationId,
      cloudId,
      email,
      apiKey,
      accountId: org.jiraAccountId,
    };
  }

  private resolveEnvFallback(
    organizationId: string,
  ): ResolvedJiraCredentials | null {
    const envConfig = buildJiraConfig();
    if (!isJiraConfigured(envConfig)) {
      return null;
    }

    const accountId = process.env[EnvKey.JiraAccountId]?.trim() || null;

    return {
      organizationId,
      cloudId: envConfig.cloudId,
      email: envConfig.email,
      apiKey: envConfig.apiKey,
      accountId,
    };
  }

  private decryptStoredToken(ciphertext: string | null): string {
    if (!ciphertext) {
      throw new BadRequestException('Jira API token is not configured.');
    }
    return decrypt(ciphertext, requireEncryptionKey(this.encryptionConfig));
  }

  private async findOrganizationOrThrow(
    organizationId: string,
  ): Promise<Organization> {
    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException(
        `Organization with id "${organizationId}" not found.`,
      );
    }
    return org;
  }

  private async loadOrganizationWithCredentials(
    organizationId: string,
  ): Promise<Organization> {
    const org = await this.organizationRepository
      .createQueryBuilder('organization')
      .addSelect('organization.jiraApiToken')
      .where('organization.id = :id', { id: organizationId })
      .getOne();

    if (!org) {
      throw new NotFoundException(
        `Organization with id "${organizationId}" not found.`,
      );
    }
    return org;
  }

  private toConfigResponse(
    org: Organization,
    configured: boolean,
  ): JiraConfigResponse {
    return {
      jiraCloudId: org.jiraCloudId,
      jiraEmail: org.jiraEmail,
      jiraAccountId: org.jiraAccountId,
      configured,
    };
  }

  private async invalidateProjectsCache(organizationId: string): Promise<void> {
    await this.redis.del(`${JIRA_PROJECTS_CACHE_PREFIX}${organizationId}:v1`);
  }

  private async verifyCredentials(
    credentials: ResolvedJiraCredentials,
  ): Promise<{ accountId: string | null }> {
    const gatewayUrl = requireJiraApiGatewayUrl(this.jiraConfig);
    const auth = Buffer.from(
      `${credentials.email}:${credentials.apiKey}`,
    ).toString('base64');
    const url = `${gatewayUrl}/${credentials.cloudId}/rest/api/3/myself`;

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
        `Jira credential test failed (${response.status}): ${errorBody.slice(0, 200)}`,
      );
      throw new BadRequestException(
        'Jira credentials could not be verified. Check cloud id, email, and API token.',
      );
    }

    const data = (await response.json()) as JiraMyselfResponse;
    return { accountId: data.accountId?.trim() || null };
  }
}
