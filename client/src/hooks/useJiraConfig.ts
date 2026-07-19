'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations.api';
import { JiraConfig, UpdateJiraConfigPayload } from '@/types/organization';
import { useToast } from '@/providers/ToastProvider';
import { useAuthContext } from '@/providers/AuthProvider';

export const jiraConfigKeys = {
  all: (userId: string) => ['jira-config', userId] as const,
};

export function useJiraConfig() {
  const { user } = useAuthContext();
  const userId = user?.id ?? '';

  return useQuery<JiraConfig, Error>({
    queryKey: jiraConfigKeys.all(userId),
    queryFn: () => organizationsApi.getJiraConfig(),
    enabled: !!userId && user?.role === 'ADMIN',
  });
}

export function useUpdateJiraConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  return useMutation<JiraConfig, Error, UpdateJiraConfigPayload>({
    mutationFn: (payload) => organizationsApi.updateJiraConfig(payload),
    onSuccess: (config) => {
      if (user?.id) {
        queryClient.setQueryData(jiraConfigKeys.all(user.id), config);
      }
      showToast('Jira credentials saved.', 'success');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to save Jira credentials.', 'error');
    },
  });
}

export function useTestJiraConfig() {
  const { showToast } = useToast();

  return useMutation<{ ok: true }, Error, UpdateJiraConfigPayload>({
    mutationFn: (payload) => organizationsApi.testJiraConfig(payload),
    onSuccess: () => {
      showToast('Jira credentials verified.', 'success');
    },
    onError: (err) => {
      showToast(err.message || 'Jira credential test failed.', 'error');
    },
  });
}
