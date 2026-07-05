import { Provider } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { openAiConfiguration, OpenAiConfig } from './openai.config';
import { jiraConfiguration, JiraConfig } from './jira.config';
import {
  azureStorageConfiguration,
  AzureStorageConfig,
} from './azure.config';
import { authConfiguration, AuthConfig } from './auth.config';
import { redisConfiguration, RedisConfig } from './redis.config';

export type { AzureStorageConfig } from './azure.config';
export type { OpenAiConfig } from './openai.config';
export type { JiraConfig } from './jira.config';
export type { AuthConfig } from './auth.config';
export type { RedisConfig } from './redis.config';

export const defaultOpenAiConfig = (): OpenAiConfig => ({
  apiKey: 'test-api-key',
  gptModel: 'gpt-4o-mini',
  whisperModel: 'whisper-1',
  extractionModel: 'gpt-4o',
});

export const defaultJiraConfig = (): JiraConfig => ({
  apiGatewayUrl: 'https://api.atlassian.com/ex/jira',
  cloudId: 'cloud-123',
  apiKey: 'token-abc',
  email: 'user@example.com',
  projectKey: 'PROJ',
  baseUrl: 'https://example.atlassian.net',
});

export const defaultAzureStorageConfig = (): AzureStorageConfig => ({
  connectionString:
    'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key;EndpointSuffix=core.windows.net',
  accountName: null,
  accountKey: null,
  containerName: 'test-container',
  sasExpiresInMinutes: 60,
});

export function provideOpenAiConfig(
  overrides: Partial<OpenAiConfig> = {},
): Provider {
  return {
    provide: openAiConfiguration.KEY,
    useValue: { ...defaultOpenAiConfig(), ...overrides },
  };
}

export function provideJiraConfig(
  overrides: Partial<JiraConfig> = {},
): Provider {
  return {
    provide: jiraConfiguration.KEY,
    useValue: { ...defaultJiraConfig(), ...overrides },
  };
}

export function provideAzureStorageConfig(
  overrides: Partial<AzureStorageConfig> = {},
): Provider {
  return {
    provide: azureStorageConfiguration.KEY,
    useValue: { ...defaultAzureStorageConfig(), ...overrides },
  };
}

export function provideAuthConfig(
  overrides: Partial<AuthConfig> = {},
): Provider {
  return {
    provide: authConfiguration.KEY,
    useValue: {
      jwtSecret: 'test-secret',
      jwtExpiresIn: '7d',
      googleClientId: 'google-client-id',
      googleClientSecret: 'google-client-secret',
      googleCallbackUrl: 'http://localhost:4000/api/auth/google/callback',
      ...overrides,
    },
  };
}

export function provideRedisConfig(
  overrides: Partial<RedisConfig> = {},
): Provider {
  return {
    provide: redisConfiguration.KEY,
    useValue: {
      url: 'redis://localhost:6379',
      useTls: false,
      ...overrides,
    },
  };
}

export type InjectedOpenAiConfig = ConfigType<typeof openAiConfiguration>;
export type InjectedJiraConfig = ConfigType<typeof jiraConfiguration>;
