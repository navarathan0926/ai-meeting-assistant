import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';
import { EnvKey } from './env.keys';

const NODE_ENV_VALUES = ['development', 'production', 'test'] as const;

/**
 * Validates environment variable shapes at startup.
 * Does not require optional integrations (Jira, Google OAuth) to be present.
 */
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
}

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

  return config;
}
