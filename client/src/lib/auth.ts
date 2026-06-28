/**
 * lib/auth.ts
 * Client-side auth token helpers — persists JWT to localStorage.
 */

const TOKEN_KEY = 'auth_token';

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  // Guard against stale "undefined" string stored by a previous bug
  if (!token || token === 'undefined' || token === 'null') {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
