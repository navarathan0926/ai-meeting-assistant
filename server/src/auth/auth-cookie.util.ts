import { Response } from 'express';

export const AUTH_COOKIE_NAME = 'access_token';

const DURATION_PATTERN = /^(\d+)([smhd])$/;

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
  options: { maxAgeMs: number; secure: boolean },
): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'lax',
    maxAge: options.maxAgeMs,
    path: '/',
  });
}

export function clearAuthCookie(res: Response, secure: boolean): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  });
}
