/**
 * lib/axios.ts
 * Single Axios instance used across all API calls.
 * Auth is handled via httpOnly cookies (withCredentials).
 */
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export default apiClient;
