'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationUsersApi } from '@/lib/api/organization-users.api';
import { getUserFacingErrorMessage } from '@/lib/api/auth-errors';
import {
  CreateOrganizationUserPayload,
  OrganizationUserSummary,
} from '@/types/organization';
import { useToast } from '@/providers/ToastProvider';

export const organizationUserKeys = {
  all: ['organization-users'] as const,
};

export function useOrganizationUsers(enabled = true) {
  return useQuery<OrganizationUserSummary[], Error>({
    queryKey: organizationUserKeys.all,
    queryFn: () => organizationUsersApi.list(),
    enabled,
  });
}

export function useCreateOrganizationUser() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<OrganizationUserSummary, Error, CreateOrganizationUserPayload>({
    mutationFn: (payload) => organizationUsersApi.create(payload),
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: organizationUserKeys.all });
      showToast(`User ${user.email} created.`, 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to create user.'), 'error');
    },
  });
}

export function useSuspendOrganizationUser() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<OrganizationUserSummary, Error, string>({
    mutationFn: (id) => organizationUsersApi.suspend(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationUserKeys.all });
      showToast('User suspended.', 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to suspend user.'), 'error');
    },
  });
}

export function useReactivateOrganizationUser() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<OrganizationUserSummary, Error, string>({
    mutationFn: (id) => organizationUsersApi.reactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationUserKeys.all });
      showToast('User reactivated.', 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to reactivate user.'), 'error');
    },
  });
}

export function useDeleteOrganizationUser() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: (id) => organizationUsersApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationUserKeys.all });
      showToast('User deleted.', 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to delete user.'), 'error');
    },
  });
}
