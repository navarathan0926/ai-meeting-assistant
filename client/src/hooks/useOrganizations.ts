'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations.api';
import { getUserFacingErrorMessage } from '@/lib/api/auth-errors';
import {
  CreateOrganizationAdminPayload,
  CreateOrganizationPayload,
  OrganizationAdminSummary,
  OrganizationSummary,
} from '@/types/organization';
import { useToast } from '@/providers/ToastProvider';

export const organizationKeys = {
  all: ['organizations'] as const,
  admins: (organizationId: string) =>
    ['organizations', organizationId, 'admins'] as const,
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
      showToast(getUserFacingErrorMessage(err, 'Failed to create organization.'), 'error');
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
      showToast(getUserFacingErrorMessage(err, 'Failed to suspend organization.'), 'error');
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
      showToast(getUserFacingErrorMessage(err, 'Failed to reactivate organization.'), 'error');
    },
  });
}

export function useCreateOrganizationAdmin() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<
    { id: string; email: string; name: string; role: string },
    Error,
    { organizationId: string; payload: CreateOrganizationAdminPayload }
  >({
    mutationFn: ({ organizationId, payload }) =>
      organizationsApi.createAdmin(organizationId, payload),
    onSuccess: (admin, { organizationId }) => {
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.admins(organizationId),
      });
      showToast(`Admin ${admin.email} created.`, 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to create admin user.'), 'error');
    },
  });
}

export function useOrganizationAdmins(organizationId: string | null) {
  return useQuery<OrganizationAdminSummary[], Error>({
    queryKey: organizationKeys.admins(organizationId ?? ''),
    queryFn: () => organizationsApi.listAdmins(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useSuspendOrganizationAdmin(organizationId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<OrganizationAdminSummary, Error, string>({
    mutationFn: (userId) => organizationsApi.suspendAdmin(organizationId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.admins(organizationId),
      });
      showToast('Admin suspended.', 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to suspend admin.'), 'error');
    },
  });
}

export function useReactivateOrganizationAdmin(organizationId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<OrganizationAdminSummary, Error, string>({
    mutationFn: (userId) =>
      organizationsApi.reactivateAdmin(organizationId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.admins(organizationId),
      });
      showToast('Admin reactivated.', 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to reactivate admin.'), 'error');
    },
  });
}

export function useDeleteOrganizationAdmin(organizationId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: (userId) => organizationsApi.deleteAdmin(organizationId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.admins(organizationId),
      });
      showToast('Admin deleted.', 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to delete admin.'), 'error');
    },
  });
}
