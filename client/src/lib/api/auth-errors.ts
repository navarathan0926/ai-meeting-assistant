import { ApiErrorResponse } from '@/types/auth';

function getAxiosResponseStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return undefined;
  }

  return (error as { response?: { status?: number } }).response?.status;
}

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

export function getUserFacingErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const apiMessage = getApiErrorMessage(error);
  if (apiMessage) {
    return apiMessage;
  }

  const status = getAxiosResponseStatus(error);
  if (status === 403) {
    return "You don't have permission to do that.";
  }
  if (status === 401) {
    return 'Your session expired. Please sign in again.';
  }
  if (status === 404) {
    return 'The requested item could not be found.';
  }
  if (status === 409) {
    return 'That action conflicts with existing data.';
  }
  if (status && status >= 500) {
    return 'Something went wrong on our end. Please try again.';
  }

  if (
    error &&
    typeof error === 'object' &&
    'request' in error &&
    !('response' in error)
  ) {
    return 'Unable to reach the server. Check your connection.';
  }

  return fallback;
}
