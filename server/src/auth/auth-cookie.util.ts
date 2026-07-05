import { CookieOptions } from 'express';
import { Response } from 'express';

export const AUTH_COOKIE_NAME = 'access_token';

const DURATION_PATTERN = /^(\d+)([smhd])$/;
const IP_V4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

export interface AuthCookieOptions {
  maxAgeMs?: number;
  secure: boolean;
  domain?: string;
}

/**
 * Derives a shared parent-domain cookie (e.g. `.meetingly.live`) from the
 * frontend URL so middleware on the apex host can read tokens set by the API
 * subdomain. Skipped for localhost and IP hosts where a Domain attribute breaks cookies.
 */
export function resolveAuthCookieDomain(clientUrl: string): string | undefined {
  try {
    const hostname = new URL(clientUrl).hostname;

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      IP_V4_PATTERN.test(hostname)
    ) {
      return undefined;
    }

    return `.${hostname}`;
  } catch {
    return undefined;
  }
}

function buildAuthCookieOptions(
  options: AuthCookieOptions,
): CookieOptions {
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'lax',
    path: '/',
  };

  if (options.maxAgeMs !== undefined) {
    cookieOptions.maxAge = options.maxAgeMs;
  }

  if (options.domain) {
    cookieOptions.domain = options.domain;
  }

  return cookieOptions;
}

export function parseJwtDurationToMs(duration: string): number {
  const match = DURATION_PATTERN.exec(duration.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export function setAuthCookie(
  res: Response,
  token: string,
  options: AuthCookieOptions & { maxAgeMs: number },
): void {
  res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions(options));
}

export function clearAuthCookie(
  res: Response,
  options: Omit<AuthCookieOptions, 'maxAgeMs'>,
): void {
  res.clearCookie(AUTH_COOKIE_NAME, buildAuthCookieOptions(options));
}
