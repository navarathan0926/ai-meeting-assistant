import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { normalizeBaseUrl, readEnv } from './env.helpers';

export interface JiraConfig {
  apiGatewayUrl: string;
  cloudId: string;
  apiKey: string;
  email: string;
  /** Optional fallback when AI/reviewer do not supply a project key. */
  projectKey: string;
  baseUrl: string | null;
  projectsCacheTtlSeconds: number;
}

const DEFAULT_PROJECTS_CACHE_TTL_SECONDS = 3600;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildJiraConfig(
  source: NodeJS.ProcessEnv = process.env,
): JiraConfig {
  return {
    apiGatewayUrl: readEnv(source, EnvKey.JiraApiGatewayUrl) ?? '',
    cloudId: readEnv(source, EnvKey.CloudId) ?? '',
    apiKey: readEnv(source, EnvKey.JiraApiKey) ?? '',
    email: readEnv(source, EnvKey.JiraEmail) ?? '',
    projectKey: readEnv(source, EnvKey.JiraProjectKey) ?? '',
    baseUrl: readEnv(source, EnvKey.JiraBaseUrl) ?? null,
    projectsCacheTtlSeconds: parsePositiveInt(
      readEnv(source, EnvKey.JiraProjectsCacheTtlSeconds),
      DEFAULT_PROJECTS_CACHE_TTL_SECONDS,
    ),
  };
}

/** Credentials required to call Jira APIs (project key is optional fallback). */
export function isJiraConfigured(config: JiraConfig): boolean {
  return Boolean(config.cloudId && config.apiKey && config.email);
}

export function requireJiraApiGatewayUrl(config: JiraConfig): string {
  const url = config.apiGatewayUrl.trim();
  if (!url) {
    throw new Error(
      `Missing required environment variable "${EnvKey.JiraApiGatewayUrl}". Set it in your .env file.`,
    );
  }
  return normalizeBaseUrl(url);
}

export function requireJiraCredentials(config: JiraConfig): {
  cloudId: string;
  apiKey: string;
  email: string;
  projectKey: string;
} {
  if (!isJiraConfigured(config)) {
    throw new Error(
      `Jira integration is not configured. Set ${EnvKey.CloudId}, ${EnvKey.JiraApiKey}, and ${EnvKey.JiraEmail}.`,
    );
  }

  return {
    cloudId: config.cloudId,
    apiKey: config.apiKey,
    email: config.email,
    projectKey: config.projectKey,
  };
}

export const jiraConfiguration = registerAs('jira', () => buildJiraConfig());
