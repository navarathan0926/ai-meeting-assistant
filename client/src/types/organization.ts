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

export interface OrganizationUserSummary {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  provider: 'local' | 'google';
  isActive: boolean;
  createdAt: string;
}

export interface OrganizationAdminSummary {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
  provider: 'local' | 'google';
  isActive: boolean;
  createdAt: string;
}

export interface CreateOrganizationUserPayload {
  email: string;
  name: string;
  password: string;
}
