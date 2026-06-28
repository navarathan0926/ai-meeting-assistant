/**
 * lib/axios.ts
 * Single Axios instance used across all API calls.
 * Base URL is read from the NEXT_PUBLIC_API_URL env var so it
 * works in both dev (localhost:3001) and production without code changes.
 */
import axios from 'axios';
import { getToken, removeToken } from './auth';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ── Request interceptor ────────────────────────────────────────────
// Attach JWT Bearer token when available.
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor ───────────────────────────────────────────
// Handle 401 → clear token (redirect handled by AuthProvider).
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      removeToken();
      // Let the AuthProvider detect the missing token and redirect
    }
    return Promise.reject(error);
  },
);

export default apiClient;
