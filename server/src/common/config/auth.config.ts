import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { readEnv } from './env.helpers';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
}

const INSECURE_JWT_SECRETS = new Set(['changeme', '']);

function resolveJwtSecret(): string {
  const secret = readEnv(process.env, EnvKey.JwtSecret);
  const nodeEnv = readEnv(process.env, EnvKey.NodeEnv) ?? 'development';

  if (nodeEnv === 'production') {
    if (!secret || INSECURE_JWT_SECRETS.has(secret)) {
      throw new Error(
        `Missing or insecure ${EnvKey.JwtSecret}. Set a long random value in production.`,
      );
    }
    return secret;
  }

  return secret ?? 'changeme';
}

export const authConfiguration = registerAs(
  'auth',
  (): AuthConfig => ({
    jwtSecret: resolveJwtSecret(),
    jwtExpiresIn: readEnv(process.env, EnvKey.JwtExpiresIn) ?? '7d',
    googleClientId:
      readEnv(process.env, EnvKey.GoogleClientId) ?? 'MISSING_CLIENT_ID',
    googleClientSecret:
      readEnv(process.env, EnvKey.GoogleClientSecret) ??
      'MISSING_CLIENT_SECRET',
    googleCallbackUrl:
      readEnv(process.env, EnvKey.GoogleCallbackUrl) ??
      'http://localhost:4000/api/auth/google/callback',
  }),
);
