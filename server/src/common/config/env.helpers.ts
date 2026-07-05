import { EnvKeyName } from './env.keys';

type EnvSource = Record<string, unknown>;

/** Read a trimmed non-empty string from an env source, or undefined if missing/blank. */
export function readEnv(
  source: EnvSource,
  key: EnvKeyName,
): string | undefined {
  const raw = source[key];
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Read a required trimmed string; throws with a clear message if missing. */
export function requireEnv(source: EnvSource, key: EnvKeyName): string {
  const value = readEnv(source, key);
  if (!value) {
    throw new Error(
      `Missing required environment variable "${key}". Set it in your .env file.`,
    );
  }
  return value;
}

/** Read an integer env var with a fallback when missing or invalid. */
export function readIntEnv(
  source: EnvSource,
  key: EnvKeyName,
  fallback: number,
): number {
  const raw = readEnv(source, key);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Strip trailing slashes from a URL base. */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
