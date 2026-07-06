import apiClient from './axios';
import { ACCESS_TOKEN_KEY, AuthUser } from '@/types/auth';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function logoutUser(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await apiClient.get<{ data: AuthUser }>('/auth/me');
  return res.data.data;
}
