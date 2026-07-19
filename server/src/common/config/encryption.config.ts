import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { readEnv } from './env.helpers';

export interface EncryptionConfig {
  key: string | null;
}

export function buildEncryptionConfig(
  source: NodeJS.ProcessEnv = process.env,
): EncryptionConfig {
  return {
    key: readEnv(source, EnvKey.EncryptionKey) ?? null,
  };
}

export function requireEncryptionKey(config: EncryptionConfig): string {
  const key = config.key?.trim();
  if (!key) {
    throw new Error(
      `Missing required environment variable "${EnvKey.EncryptionKey}". Set a 32-byte hex string in your .env file.`,
    );
  }
  return key;
}

export const encryptionConfiguration = registerAs('encryption', () =>
  buildEncryptionConfig(),
);
