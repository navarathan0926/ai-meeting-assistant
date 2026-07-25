/**
 * lib/axios.ts
 * Single Axios instance used across all API calls.
 * Auth is sent via Authorization: Bearer header.
 */
import axios from 'axios';
import { getApiErrorCode } from '@/lib/api/auth-errors';
import {
  ACCESS_TOKEN_KEY,
  AuthErrorCode,
  AuthLoginRedirectError,
} from '@/types/auth';

const SESSION_ENDING_REDIRECTS: Record<string, AuthLoginRedirectError> = {
  [AuthErrorCode.ORGANIZATION_SUSPENDED]:
    AuthLoginRedirectError.ORGANIZATION_SUSPENDED,
  [AuthErrorCode.ORGANIZATION_REQUIRED]:
    AuthLoginRedirectError.ORGANIZATION_REQUIRED,
  [AuthErrorCode.USER_SUSPENDED]: AuthLoginRedirectError.USER_SUSPENDED,
};

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window === 'undefined') {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const code = getApiErrorCode(error);
    const redirectError = code ? SESSION_ENDING_REDIRECTS[code] : undefined;

    if (status === 403 && redirectError) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.location.assign(`/login?error=${redirectError}`);
      return Promise.reject(error);
    }

    if (status === 401) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
