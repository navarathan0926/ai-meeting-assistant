export const ACCESS_TOKEN_KEY = 'access_token';

export type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
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

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  code?: string;
  error?: string;
}

export const AUTH_ERROR_CODES = {
  GOOGLE_AUTH_REQUIRED: 'GOOGLE_AUTH_REQUIRED',
  GOOGLE_ACCOUNT_EXISTS: 'GOOGLE_ACCOUNT_EXISTS',
} as const;
