export const ACCESS_TOKEN_KEY = 'access_token';

export enum UserRole {
  User = 'USER',
  Admin = 'ADMIN',
  SuperAdmin = 'SUPERADMIN',
}

export enum AuthErrorCode {
  GOOGLE_AUTH_REQUIRED = 'GOOGLE_AUTH_REQUIRED',
  GOOGLE_ACCOUNT_EXISTS = 'GOOGLE_ACCOUNT_EXISTS',
  ORGANIZATION_SUSPENDED = 'ORGANIZATION_SUSPENDED',
  ORGANIZATION_REQUIRED = 'ORGANIZATION_REQUIRED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  REGISTRATION_DISABLED = 'REGISTRATION_DISABLED',
  OAUTH_CODE_INVALID = 'OAUTH_CODE_INVALID',
}

/** @deprecated Prefer AuthErrorCode */
export const AUTH_ERROR_CODES = AuthErrorCode;

/** Query `error=` / `message=` values on the login page. */
export enum AuthLoginRedirectError {
  GOOGLE_AUTH_FAILED = 'google_auth_failed',
  REGISTRATION_DISABLED = 'registration_disabled',
  ORGANIZATION_SUSPENDED = 'organization_suspended',
  ORGANIZATION_REQUIRED = 'organization_required',
  USER_SUSPENDED = 'user_suspended',
}

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
