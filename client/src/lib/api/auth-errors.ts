import { ApiErrorResponse } from '@/types/auth';

export function getApiErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return null;
  }

  const data = (error as { response?: { data?: ApiErrorResponse } }).response
    ?.data;
  if (!data?.message) {
    return null;
  }

  return Array.isArray(data.message) ? data.message[0] : data.message;
}

export function getApiErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return null;
  }

  return (
    (error as { response?: { data?: ApiErrorResponse } }).response?.data
      ?.code ?? null
  );
}
