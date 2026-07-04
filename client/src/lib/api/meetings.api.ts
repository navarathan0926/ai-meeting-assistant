import apiClient from '../axios';
import { ApiResponse } from '@/types/api';
import { Meeting } from '@/types/meeting';

/**
 * meetingsApi
 * All HTTP calls related to meetings in one place.
 * Hooks import from here — they never call axios directly.
 *
 * The server wraps every response in { data, statusCode, timestamp },
 * so we unwrap .data.data to get the actual payload.
 */
export const meetingsApi = {
  /**
   * Upload an audio file for processing.
   * Returns immediately with a PENDING meeting; use pollMeeting to track status.
   */
  upload: async (file: File): Promise<Meeting> => {
    const form = new FormData();
    form.append('audio', file);

    const response = await apiClient.post<ApiResponse<Meeting>>(
      '/meetings/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  /** Fetch a single meeting by ID (used for polling until completed) */
  getById: async (id: string): Promise<Meeting> => {
    const response = await apiClient.get<ApiResponse<Meeting>>(
      `/meetings/${id}`,
    );
    return response.data.data;
  },

  /** Fetch all meetings ordered by creation date */
  getAll: async (): Promise<Meeting[]> => {
    const response = await apiClient.get<ApiResponse<Meeting[]>>('/meetings');
    return response.data.data;
  },

  /**
   * Permanently delete a meeting by ID.
   * Removes the blob from Azure and all linked DB records.
   * Server returns 204 No Content.
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/meetings/${id}`);
  },
};
