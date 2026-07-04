import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { readEnv } from './env.helpers';

export interface RedisConfig {
  url: string;
  useTls: boolean;
}

export function buildRedisConfig(
  source: NodeJS.ProcessEnv = process.env,
): RedisConfig {
  const url = readEnv(source, EnvKey.RedisUrl) ?? 'redis://localhost:6379';
  return {
    url,
    useTls: url.startsWith('rediss://'),
  };
}

export const redisConfiguration = registerAs('redis', () => buildRedisConfig());
