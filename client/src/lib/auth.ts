import apiClient from './axios';
import { AuthUser } from '@/types/auth';

export async function logoutUser(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await apiClient.get<{ data: AuthUser }>('/auth/me');
  return res.data.data;
}
