import apiClient from '@/lib/axios';
import {
  AuthSession,
  RegisterPayload,
  LoginPayload,
} from '@/types/auth';

interface ApiEnvelope<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthSession> {
  const res = await apiClient.post<ApiEnvelope<AuthSession>>(
    '/auth/register',
    payload,
  );
  return res.data.data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthSession> {
  const res = await apiClient.post<ApiEnvelope<AuthSession>>(
    '/auth/login',
    payload,
  );
  return res.data.data;
}

export async function exchangeOAuthCode(code: string): Promise<AuthSession> {
  const res = await apiClient.post<ApiEnvelope<AuthSession>>(
    '/auth/oauth/exchange',
    { code },
  );
  return res.data.data;
}
