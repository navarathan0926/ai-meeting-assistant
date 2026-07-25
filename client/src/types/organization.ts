import { UserRole } from '@/types/auth';

export enum OrganizationStatus {
  Active = 'active',
  Suspended = 'suspended',
}

export interface OrganizationFirstAdmin {
  name: string;
  email: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  isActive: boolean;
  status: OrganizationStatus;
  createdAt: string;
  meetingCount: number;
  extractedItemCount: number;
  firstAdmin: OrganizationFirstAdmin | null;
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
  role: UserRole.Admin;
}

export interface OrganizationUserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  provider: 'local' | 'google';
  isActive: boolean;
  createdAt: string;
}

export interface OrganizationAdminSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole.Admin;
  provider: 'local' | 'google';
  isActive: boolean;
  createdAt: string;
}

export interface CreateOrganizationUserPayload {
  email: string;
  name: string;
  password: string;
}
