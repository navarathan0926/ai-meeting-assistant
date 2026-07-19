export interface ResolvedJiraCredentials {
  organizationId: string;
  cloudId: string;
  email: string;
  apiKey: string;
  accountId: string | null;
}

export interface JiraConfigResponse {
  jiraCloudId: string | null;
  jiraEmail: string | null;
  jiraAccountId: string | null;
  configured: boolean;
}
