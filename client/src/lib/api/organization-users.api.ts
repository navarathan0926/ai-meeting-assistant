import apiClient from '../axios';
import { ApiResponse } from '@/types/api';
import {
  CreateOrganizationUserPayload,
  OrganizationUserSummary,
} from '@/types/organization';

export const organizationUsersApi = {
  list: async (): Promise<OrganizationUserSummary[]> => {
    const response = await apiClient.get<ApiResponse<OrganizationUserSummary[]>>(
      '/organizations/users',
    );
    return response.data.data;
  },

  create: async (
    payload: CreateOrganizationUserPayload,
  ): Promise<OrganizationUserSummary> => {
    const response = await apiClient.post<ApiResponse<OrganizationUserSummary>>(
      '/organizations/users',
      payload,
    );
    return response.data.data;
  },

  suspend: async (id: string): Promise<OrganizationUserSummary> => {
    const response = await apiClient.patch<ApiResponse<OrganizationUserSummary>>(
      `/organizations/users/${id}/suspend`,
    );
    return response.data.data;
  },

  reactivate: async (id: string): Promise<OrganizationUserSummary> => {
    const response = await apiClient.patch<ApiResponse<OrganizationUserSummary>>(
      `/organizations/users/${id}/reactivate`,
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/organizations/users/${id}`);
  },
};
