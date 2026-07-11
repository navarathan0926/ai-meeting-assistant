import { appConfiguration } from './app.config';
import { authConfiguration } from './auth.config';
import { azureStorageConfiguration } from './azure.config';
import { databaseConfiguration } from './database.config';
import { jiraConfiguration } from './jira.config';
import { openAiConfiguration } from './openai.config';
import { redisConfiguration } from './redis.config';
import { extractionConfiguration } from './extraction.config';

export { EnvKey } from './env.keys';
export type { EnvKeyName } from './env.keys';
export { readEnv, requireEnv, readIntEnv, normalizeBaseUrl } from './env.helpers';
export { validateEnvironment } from './env.validation';

export { appConfiguration, type AppConfig } from './app.config';
export { authConfiguration, type AuthConfig } from './auth.config';
export {
  azureStorageConfiguration,
  buildAzureStorageConfig,
  isAzureStorageConfigured,
  type AzureStorageConfig,
} from './azure.config';
export {
  databaseConfiguration,
  buildDatabaseConfig,
  type DatabaseConfig,
} from './database.config';
export {
  jiraConfiguration,
  buildJiraConfig,
  isJiraConfigured,
  requireJiraApiGatewayUrl,
  requireJiraCredentials,
  type JiraConfig,
} from './jira.config';
export {
  extractionConfiguration,
  buildExtractionConfig,
  type ExtractionConfig,
} from './extraction.config';
export { openAiConfiguration, type OpenAiConfig } from './openai.config';
export {
  redisConfiguration,
  buildRedisConfig,
  type RedisConfig,
} from './redis.config';

/** All typed config namespaces loaded once at startup. */
export const configurations = [
  appConfiguration,
  databaseConfiguration,
  openAiConfiguration,
  jiraConfiguration,
  extractionConfiguration,
  azureStorageConfiguration,
  authConfiguration,
  redisConfiguration,
];
