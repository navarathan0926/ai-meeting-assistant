import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { readEnv, readIntEnv } from './env.helpers';

export interface AzureStorageConfig {
  connectionString: string | null;
  accountName: string | null;
  accountKey: string | null;
  containerName: string;
  sasExpiresInMinutes: number;
}

export function buildAzureStorageConfig(
  source: NodeJS.ProcessEnv = process.env,
): AzureStorageConfig {
  const connectionString =
    readEnv(source, EnvKey.AzureStorageConnectionString) ?? null;
  const accountName = readEnv(source, EnvKey.AzureStorageAccountName) ?? null;
  const accountKey = readEnv(source, EnvKey.AzureStorageAccountKey) ?? null;

  return {
    connectionString,
    accountName,
    accountKey,
    containerName:
      readEnv(source, EnvKey.AzureStorageContainerName) ??
      readEnv(source, EnvKey.AzureStorageContainer) ??
      'uploads',
    sasExpiresInMinutes: readIntEnv(
      source,
      EnvKey.AzureBlobSasExpiresInMinutes,
      60,
    ),
  };
}

export function isAzureStorageConfigured(config: AzureStorageConfig): boolean {
  return Boolean(
    config.connectionString || (config.accountName && config.accountKey),
  );
}

export const azureStorageConfiguration = registerAs('azureStorage', () =>
  buildAzureStorageConfig(),
);
