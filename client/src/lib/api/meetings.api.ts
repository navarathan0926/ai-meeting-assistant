import apiClient from '../axios';
import { ApiResponse, PaginatedResponse } from '@/types/api';
import { Meeting } from '@/types/meeting';

export interface ListMeetingsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const meetingsApi = {
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

  getById: async (id: string): Promise<Meeting> => {
    const response = await apiClient.get<ApiResponse<Meeting>>(
      `/meetings/${id}`,
    );
    return response.data.data;
  },

  getAll: async (
    params: ListMeetingsParams = {},
  ): Promise<PaginatedResponse<Meeting>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Meeting>>>(
      '/meetings',
      { params },
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/meetings/${id}`);
  },
};
