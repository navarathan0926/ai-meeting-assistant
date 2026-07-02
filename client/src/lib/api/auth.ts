import apiClient from '@/lib/axios';
import {
  AuthResult,
  RegisterPayload,
  LoginPayload,
} from '@/types/auth';

interface ApiEnvelope<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
  const res = await apiClient.post<ApiEnvelope<AuthResult>>(
    '/auth/register',
    payload,
  );
  return res.data.data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResult> {
  const res = await apiClient.post<ApiEnvelope<AuthResult>>(
    '/auth/login',
    payload,
  );
  return res.data.data;
}

export async function exchangeOAuthCode(code: string): Promise<AuthResult> {
  const res = await apiClient.post<ApiEnvelope<AuthResult>>(
    '/auth/oauth/exchange',
    { code },
  );
  return res.data.data;
}
