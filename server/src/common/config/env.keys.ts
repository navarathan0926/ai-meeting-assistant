/**
 * Single source of truth for environment variable names.
 * Use these constants instead of string literals to avoid typos at compile time.
 */
export const EnvKey = {
  // Application
  NodeEnv: 'NODE_ENV',
  Port: 'PORT',
  ClientUrl: 'CLIENT_URL',
  FrontendUrl: 'FRONTEND_URL',

  // Database
  DbHost: 'DB_HOST',
  DbPort: 'DB_PORT',
  DbUsername: 'DB_USERNAME',
  DbPassword: 'DB_PASSWORD',
  DbName: 'DB_NAME',

  // OpenAI
  OpenAiApiKey: 'OPENAI_API_KEY',
  OpenAiGptModel: 'OPENAI_GPT_MODEL',
  OpenAiWhisperModel: 'OPENAI_WHISPER_MODEL',
  OpenAiExtractionModel: 'OPENAI_EXTRACTION_MODEL',

  // Jira
  JiraApiGatewayUrl: 'JIRA_API_GATEWAY_URL',
  CloudId: 'CLOUD_ID',
  JiraApiKey: 'JIRA_API_KEY',
  JiraEmail: 'JIRA_EMAIL',
  JiraProjectKey: 'JIRA_PROJECT_KEY',
  JiraBaseUrl: 'JIRA_BASE_URL',
  JiraProjectsCacheTtlSeconds: 'JIRA_PROJECTS_CACHE_TTL_SECONDS',

  // Extraction confidence thresholds (Phase 9)
  ExtractionConfidenceThreshold: 'EXTRACTION_CONFIDENCE_THRESHOLD',
  ProjectConfidenceThreshold: 'PROJECT_CONFIDENCE_THRESHOLD',
  MeetingRelevanceThreshold: 'MEETING_RELEVANCE_THRESHOLD',

  // Azure Blob Storage
  AzureStorageConnectionString: 'AZURE_STORAGE_CONNECTION_STRING',
  AzureStorageAccountName: 'AZURE_STORAGE_ACCOUNT_NAME',
  AzureStorageAccountKey: 'AZURE_STORAGE_ACCOUNT_KEY',
  AzureStorageContainerName: 'AZURE_STORAGE_CONTAINER_NAME',
  AzureStorageContainer: 'AZURE_STORAGE_CONTAINER',
  AzureBlobSasExpiresInMinutes: 'AZURE_BLOB_SAS_EXPIRES_IN_MINUTES',

  // Auth
  JwtSecret: 'JWT_SECRET',
  JwtExpiresIn: 'JWT_EXPIRES_IN',
  GoogleClientId: 'GOOGLE_CLIENT_ID',
  GoogleClientSecret: 'GOOGLE_CLIENT_SECRET',
  GoogleCallbackUrl: 'GOOGLE_CALLBACK_URL',

  // Redis
  RedisUrl: 'REDIS_URL',
  RedisTlsRejectUnauthorized: 'REDIS_TLS_REJECT_UNAUTHORIZED',
} as const;

export type EnvKeyName = (typeof EnvKey)[keyof typeof EnvKey];
