import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { normalizeBaseUrl, readEnv, requireEnv } from './env.helpers';

export interface JiraConfig {
  apiGatewayUrl: string;
  cloudId: string;
  apiKey: string;
  email: string;
  projectKey: string;
  baseUrl: string | null;
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
  };
}

export function isJiraConfigured(config: JiraConfig): boolean {
  return Boolean(
    config.cloudId && config.apiKey && config.email && config.projectKey,
  );
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
      `Jira integration is not configured. Set ${EnvKey.CloudId}, ${EnvKey.JiraApiKey}, ${EnvKey.JiraEmail}, and ${EnvKey.JiraProjectKey}.`,
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
