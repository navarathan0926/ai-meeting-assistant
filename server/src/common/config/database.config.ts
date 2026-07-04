import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { readEnv, readIntEnv } from './env.helpers';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
}

function resolveDbUsername(source: NodeJS.ProcessEnv): string {
  const username = readEnv(source, EnvKey.DbUsername);
  if (username) {
    return username;
  }
  return readEnv(source, EnvKey.DbPassword) ? 'postgres' : '';
}

export function buildDatabaseConfig(
  source: NodeJS.ProcessEnv = process.env,
): DatabaseConfig {
  const host = readEnv(source, EnvKey.DbHost) ?? 'localhost';
  const localHosts = new Set(['localhost', 'host.docker.internal', 'postgres']);

  return {
    host,
    port: readIntEnv(source, EnvKey.DbPort, 5432),
    username: resolveDbUsername(source),
    password: readEnv(source, EnvKey.DbPassword) ?? '',
    database: readEnv(source, EnvKey.DbName) ?? 'ai_meeting_assistant',
    ssl: !localHosts.has(host),
  };
}

export const databaseConfiguration = registerAs('database', () =>
  buildDatabaseConfig(),
);
