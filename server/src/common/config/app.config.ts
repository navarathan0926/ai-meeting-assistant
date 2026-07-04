import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { readEnv, readIntEnv } from './env.helpers';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  clientUrl: string;
  frontendUrl: string;
}

export const appConfiguration = registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: readEnv(process.env, EnvKey.NodeEnv) ?? 'development',
    port: readIntEnv(process.env, EnvKey.Port, 4000),
    clientUrl:
      readEnv(process.env, EnvKey.ClientUrl) ?? 'http://localhost:3000',
    frontendUrl:
      readEnv(process.env, EnvKey.FrontendUrl) ?? 'http://localhost:3000',
  }),
);
