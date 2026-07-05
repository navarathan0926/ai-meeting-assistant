import apiClient from '../axios';
import { ApiResponse } from '@/types/api';
import {
  ApproveExtractedItemResult,
  ExtractedItem,
  UpdateExtractedItemPayload,
} from '@/types/extracted-item';

export const extractedItemsApi = {
  listByMeeting: async (meetingId: string): Promise<ExtractedItem[]> => {
    const response = await apiClient.get<ApiResponse<ExtractedItem[]>>(
      `/extracted-items/meeting/${meetingId}`,
    );
    return response.data.data;
  },

  update: async (
    id: string,
    payload: UpdateExtractedItemPayload,
  ): Promise<ExtractedItem> => {
    const response = await apiClient.patch<ApiResponse<ExtractedItem>>(
      `/extracted-items/${id}`,
      payload,
    );
    return response.data.data;
  },

  reject: async (id: string): Promise<ExtractedItem> => {
    const response = await apiClient.patch<ApiResponse<ExtractedItem>>(
      `/extracted-items/${id}/reject`,
    );
    return response.data.data;
  },

  approve: async (id: string): Promise<ApproveExtractedItemResult> => {
    const response = await apiClient.post<ApiResponse<ApproveExtractedItemResult>>(
      `/extracted-items/${id}/approve`,
    );
    return response.data.data;
  },
};
