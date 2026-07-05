import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { readEnv } from './env.helpers';

export interface RedisConfig {
  url: string;
  useTls: boolean;
  /** When true (default in production), TLS certificates are verified. */
  tlsRejectUnauthorized: boolean;
}

function parseTlsRejectUnauthorized(
  source: NodeJS.ProcessEnv,
  nodeEnv: string,
): boolean {
  const raw = readEnv(source, EnvKey.RedisTlsRejectUnauthorized);
  if (raw === 'false') {
    return false;
  }
  if (raw === 'true') {
    return true;
  }
  return nodeEnv === 'production';
}

export function buildRedisConfig(
  source: NodeJS.ProcessEnv = process.env,
): RedisConfig {
  const url = readEnv(source, EnvKey.RedisUrl) ?? 'redis://localhost:6379';
  const nodeEnv = readEnv(source, EnvKey.NodeEnv) ?? 'development';
  return {
    url,
    useTls: url.startsWith('rediss://'),
    tlsRejectUnauthorized: parseTlsRejectUnauthorized(source, nodeEnv),
  };
}

export const redisConfiguration = registerAs('redis', () => buildRedisConfig());
