const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const GOOGLE_AUTH_URL = `${API_BASE_URL}/auth/google`;
