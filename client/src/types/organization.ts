export type OrganizationStatus = 'active' | 'suspended';

export interface OrganizationSummary {
  id: string;
  name: string;
  isActive: boolean;
  status: OrganizationStatus;
  createdAt: string;
  meetingCount: number;
  extractedItemCount: number;
}

export interface JiraConfig {
  jiraCloudId: string | null;
  jiraEmail: string | null;
  jiraAccountId: string | null;
  configured: boolean;
}

export interface UpdateJiraConfigPayload {
  jiraCloudId: string;
  jiraEmail: string;
  jiraApiToken?: string;
}

export interface CreateOrganizationPayload {
  name: string;
}

export interface CreateOrganizationAdminPayload {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN';
}
