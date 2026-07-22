import apiClient from '../axios';
import { ApiResponse } from '@/types/api';
import {
  CreateOrganizationAdminPayload,
  CreateOrganizationPayload,
  JiraConfig,
  OrganizationAdminSummary,
  OrganizationSummary,
  UpdateJiraConfigPayload,
} from '@/types/organization';

export const organizationsApi = {
  list: async (): Promise<OrganizationSummary[]> => {
    const response = await apiClient.get<ApiResponse<OrganizationSummary[]>>(
      '/organizations',
    );
    return response.data.data;
  },

  get: async (id: string): Promise<OrganizationSummary> => {
    const response = await apiClient.get<ApiResponse<OrganizationSummary>>(
      `/organizations/${id}`,
    );
    return response.data.data;
  },

  create: async (
    payload: CreateOrganizationPayload,
  ): Promise<OrganizationSummary> => {
    const response = await apiClient.post<ApiResponse<OrganizationSummary>>(
      '/organizations',
      payload,
    );
    return response.data.data;
  },

  suspend: async (id: string): Promise<OrganizationSummary> => {
    const response = await apiClient.patch<ApiResponse<OrganizationSummary>>(
      `/organizations/${id}/suspend`,
    );
    return response.data.data;
  },

  reactivate: async (id: string): Promise<OrganizationSummary> => {
    const response = await apiClient.patch<ApiResponse<OrganizationSummary>>(
      `/organizations/${id}/reactivate`,
    );
    return response.data.data;
  },

  createAdmin: async (
    organizationId: string,
    payload: CreateOrganizationAdminPayload,
  ): Promise<{ id: string; email: string; name: string; role: string }> => {
    const response = await apiClient.post<
      ApiResponse<{ id: string; email: string; name: string; role: string }>
    >(`/organizations/${organizationId}/admins`, payload);
    return response.data.data;
  },

  listAdmins: async (organizationId: string): Promise<OrganizationAdminSummary[]> => {
    const response = await apiClient.get<ApiResponse<OrganizationAdminSummary[]>>(
      `/organizations/${organizationId}/admins`,
    );
    return response.data.data;
  },

  suspendAdmin: async (
    organizationId: string,
    userId: string,
  ): Promise<OrganizationAdminSummary> => {
    const response = await apiClient.patch<ApiResponse<OrganizationAdminSummary>>(
      `/organizations/${organizationId}/admins/${userId}/suspend`,
    );
    return response.data.data;
  },

  reactivateAdmin: async (
    organizationId: string,
    userId: string,
  ): Promise<OrganizationAdminSummary> => {
    const response = await apiClient.patch<ApiResponse<OrganizationAdminSummary>>(
      `/organizations/${organizationId}/admins/${userId}/reactivate`,
    );
    return response.data.data;
  },

  deleteAdmin: async (organizationId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${organizationId}/admins/${userId}`);
  },

  getJiraConfig: async (): Promise<JiraConfig> => {
    const response = await apiClient.get<ApiResponse<JiraConfig>>(
      '/organizations/jira-config',
    );
    return response.data.data;
  },

  updateJiraConfig: async (
    payload: UpdateJiraConfigPayload,
  ): Promise<JiraConfig> => {
    const response = await apiClient.put<ApiResponse<JiraConfig>>(
      '/organizations/jira-config',
      payload,
    );
    return response.data.data;
  },

  testJiraConfig: async (
    payload: UpdateJiraConfigPayload,
  ): Promise<{ ok: true }> => {
    const response = await apiClient.post<ApiResponse<{ ok: true }>>(
      '/organizations/jira-config/test',
      payload,
    );
    return response.data.data;
  },
};
