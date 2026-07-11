'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jiraApi } from '@/lib/api/jira.api';
import { JiraProject } from '@/types/jira-project';
import { useToast } from '@/providers/ToastProvider';
import { useAuthContext } from '@/providers/AuthProvider';

export const jiraProjectKeys = {
  all: (userId: string) => ['jira-projects', userId] as const,
};

export function useJiraProjects() {
  const { user } = useAuthContext();
  const userId = user?.id ?? '';

  return useQuery<JiraProject[], Error>({
    queryKey: jiraProjectKeys.all(userId),
    queryFn: () => jiraApi.listProjects(),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProjectContext() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  return useMutation<JiraProject, Error, { key: string; aiContext: string }>({
    mutationFn: ({ key, aiContext }) =>
      jiraApi.updateProjectContext(key, aiContext),
    onSuccess: (updated) => {
      if (user?.id) {
        queryClient.setQueryData<JiraProject[]>(
          jiraProjectKeys.all(user.id),
          (projects) =>
            projects?.map((project) =>
              project.key === updated.key ? updated : project,
            ) ?? [updated],
        );
      }
      showToast(`Saved AI context for ${updated.key}.`, 'success');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to save project context.', 'error');
    },
  });
}
