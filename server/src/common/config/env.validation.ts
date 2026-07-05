import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';
import { EnvKey, EnvKeyName } from './env.keys';

const NODE_ENV_VALUES = ['development', 'production', 'test'] as const;

class EnvironmentVariables {
  @IsOptional()
  @IsIn(NODE_ENV_VALUES)
  [EnvKey.NodeEnv]?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  [EnvKey.Port]?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  [EnvKey.DbPort]?: number;

  @IsOptional()
  @IsString()
  [EnvKey.DbHost]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.DbUsername]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.DbPassword]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.DbName]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.OpenAiApiKey]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.OpenAiGptModel]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.OpenAiWhisperModel]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.OpenAiExtractionModel]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.JiraApiGatewayUrl]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.JwtSecret]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.RedisUrl]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.ClientUrl]?: string;

  @IsOptional()
  @IsString()
  [EnvKey.FrontendUrl]?: string;
}

const PRODUCTION_REQUIRED_KEYS: EnvKeyName[] = [
  EnvKey.DbHost,
  EnvKey.DbUsername,
  EnvKey.DbPassword,
  EnvKey.DbName,
  EnvKey.OpenAiApiKey,
  EnvKey.OpenAiGptModel,
  EnvKey.OpenAiWhisperModel,
  EnvKey.OpenAiExtractionModel,
  EnvKey.JwtSecret,
  EnvKey.RedisUrl,
  EnvKey.ClientUrl,
];

function validateProductionRequired(config: Record<string, unknown>): void {
  const nodeEnv = config[EnvKey.NodeEnv] ?? 'development';
  if (nodeEnv !== 'production') {
    return;
  }

  const missing = PRODUCTION_REQUIRED_KEYS.filter((key) => {
    const value = config[key];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Environment validation failed (production):\n${missing
        .map((key) => `  - Missing required variable: ${key}`)
        .join('\n')}`,
    );
  }
}

/**
 * Validates environment variable shapes at startup.
 * Optional integrations (Jira, Google OAuth) remain optional in all environments.
 */
export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: true,
    whitelist: true,
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    throw new Error(
      `Environment validation failed:\n${messages.map((m) => `  - ${m}`).join('\n')}`,
    );
  }

  validateProductionRequired(config);

  return config;
}
