import apiClient from '@/lib/axios';

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    provider: string;
  };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Server wraps all responses in { data: <payload>, statusCode, timestamp }
interface ApiEnvelope<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
  const res = await apiClient.post<ApiEnvelope<AuthResult>>('/auth/register', payload);
  return res.data.data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResult> {
  const res = await apiClient.post<ApiEnvelope<AuthResult>>('/auth/login', payload);
  return res.data.data;
}
