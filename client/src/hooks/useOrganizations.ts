'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations.api';
import {
  CreateOrganizationAdminPayload,
  CreateOrganizationPayload,
  OrganizationSummary,
} from '@/types/organization';
import { useToast } from '@/providers/ToastProvider';

export const organizationKeys = {
  all: ['organizations'] as const,
};

export function useOrganizations() {
  return useQuery<OrganizationSummary[], Error>({
    queryKey: organizationKeys.all,
    queryFn: () => organizationsApi.list(),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<OrganizationSummary, Error, CreateOrganizationPayload>({
    mutationFn: (payload) => organizationsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      showToast('Organization created.', 'success');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to create organization.', 'error');
    },
  });
}

export function useSuspendOrganization() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<OrganizationSummary, Error, string>({
    mutationFn: (id) => organizationsApi.suspend(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      showToast('Organization suspended.', 'success');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to suspend organization.', 'error');
    },
  });
}

export function useReactivateOrganization() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<OrganizationSummary, Error, string>({
    mutationFn: (id) => organizationsApi.reactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      showToast('Organization reactivated.', 'success');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to reactivate organization.', 'error');
    },
  });
}

export function useCreateOrganizationAdmin() {
  const { showToast } = useToast();

  return useMutation<
    { id: string; email: string; name: string; role: string },
    Error,
    { organizationId: string; payload: CreateOrganizationAdminPayload }
  >({
    mutationFn: ({ organizationId, payload }) =>
      organizationsApi.createAdmin(organizationId, payload),
    onSuccess: (admin) => {
      showToast(`Admin ${admin.email} created.`, 'success');
    },
    onError: (err) => {
      showToast(err.message || 'Failed to create admin user.', 'error');
    },
  });
}
