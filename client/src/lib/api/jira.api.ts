import apiClient from '../axios';
import { ApiResponse } from '@/types/api';
import { JiraProject } from '@/types/jira-project';

export const jiraApi = {
  listProjects: async (): Promise<JiraProject[]> => {
    const response = await apiClient.get<ApiResponse<JiraProject[]>>(
      '/jira/projects',
    );
    return response.data.data;
  },

  updateProjectContext: async (
    key: string,
    aiContext: string,
  ): Promise<JiraProject> => {
    const response = await apiClient.put<ApiResponse<JiraProject>>(
      `/jira/projects/${encodeURIComponent(key)}/context`,
      { aiContext },
    );
    return response.data.data;
  },
};
