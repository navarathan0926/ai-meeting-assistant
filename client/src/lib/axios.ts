/**
 * lib/axios.ts
 * Single Axios instance used across all API calls.
 * Base URL is read from the NEXT_PUBLIC_API_URL env var so it
 * works in both dev (localhost:4000) and production without code changes.
 */
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ── Request interceptor ────────────────────────────────────────────
// Attach auth token when available (Phase 2: Auth).
apiClient.interceptors.request.use((config) => {
  // TODO (Phase 2): attach JWT from localStorage / cookie
  return config;
});

// ── Response interceptor ───────────────────────────────────────────
// Centralise error handling so every hook gets a consistent error shape.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO (Phase 2): handle 401 → redirect to login
    return Promise.reject(error);
  },
);

export default apiClient;
