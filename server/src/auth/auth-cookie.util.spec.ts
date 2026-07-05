import {
  parseJwtDurationToMs,
  resolveAuthCookieDomain,
} from './auth-cookie.util';

describe('resolveAuthCookieDomain', () => {
  it('returns a parent domain for production frontend URLs', () => {
    expect(resolveAuthCookieDomain('https://meetingly.live')).toBe(
      '.meetingly.live',
    );
  });

  it('returns undefined for localhost', () => {
    expect(resolveAuthCookieDomain('http://localhost:3000')).toBeUndefined();
  });

  it('returns undefined for IP hosts', () => {
    expect(resolveAuthCookieDomain('http://127.0.0.1:3000')).toBeUndefined();
  });

  it('returns undefined for invalid URLs', () => {
    expect(resolveAuthCookieDomain('not-a-url')).toBeUndefined();
  });
});

describe('parseJwtDurationToMs', () => {
  it('parses day durations', () => {
    expect(parseJwtDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
