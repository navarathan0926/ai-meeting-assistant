'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '@/lib/api/meetings.api';
import { Meeting, MeetingStatus } from '@/types/meeting';
import { useToast } from '@/providers/ToastProvider';
import { useAuthContext } from '@/providers/AuthProvider';

export const meetingKeys = {
  all: (userId: string, search?: string) =>
    ['meetings', userId, 'list', search ?? ''] as const,
  detail: (userId: string, id: string) =>
    ['meetings', userId, 'detail', id] as const,
};

export function useUploadMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation<Meeting, Error, File>({
    mutationFn: (file: File) => meetingsApi.upload(file),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['meetings', user.id] });
      }
    },
  });
}

export function useMeeting(id: string | null) {
  const { user } = useAuthContext();
  const userId = user?.id ?? '';

  return useQuery<Meeting, Error>({
    queryKey: meetingKeys.detail(userId, id ?? '__none__'),
    queryFn: () => {
      if (!id) {
        throw new Error('Meeting id is required.');
      }
      return meetingsApi.getById(id);
    },
    enabled: !!id && !!userId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const isTerminal =
        status === MeetingStatus.Completed || status === MeetingStatus.Failed;
      return isTerminal ? false : 3000;
    },
  });
}

export function useMeetings(search?: string) {
  const { user } = useAuthContext();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: meetingKeys.all(userId, search),
    queryFn: () =>
      meetingsApi.getAll({ page: 1, limit: 50, search: search?.trim() || undefined }),
    enabled: !!userId,
    refetchInterval: (query) => {
      const meetings = query.state.data?.items;
      if (!meetings) return false;
      const hasPending = meetings.some(
        (m) =>
          m.status === MeetingStatus.Pending ||
          m.status === MeetingStatus.Processing,
      );
      return hasPending ? 3000 : false;
    },
  });
}

export function useDeleteMeeting(onSuccess?: (id: string) => void) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuthContext();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => meetingsApi.delete(id),
    onSuccess: (_, id) => {
      if (user?.id) {
        queryClient.removeQueries({ queryKey: meetingKeys.detail(user.id, id) });
        queryClient.invalidateQueries({ queryKey: ['meetings', user.id] });
      }
      showToast('Meeting deleted successfully!', 'success');
      onSuccess?.(id);
    },
    onError: (err) => {
      showToast(err.message || 'Failed to delete meeting.', 'error');
    },
  });
}
