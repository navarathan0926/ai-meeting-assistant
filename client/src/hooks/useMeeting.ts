import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '@/lib/api/meetings.api';
import { Meeting, MeetingStatus } from '@/types/meeting';
import { useToast } from '@/providers/ToastProvider';


// ── Query keys ────────────────────────────────────────────────────────────────
// Centralised so cache invalidation is never a string guess.

export const meetingKeys = {
  all: ['meetings'] as const,
  detail: (id: string) => ['meetings', id] as const,
};

// ── useUploadMeeting ──────────────────────────────────────────────────────────

/**
 * Uploads an audio file and returns the initial (PENDING) meeting record.
 * On success, invalidates the meetings list cache automatically.
 */
export function useUploadMeeting() {
  const queryClient = useQueryClient();

  return useMutation<Meeting, Error, File>({
    mutationFn: (file: File) => meetingsApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
}

// ── useMeeting ────────────────────────────────────────────────────────────────

/**
 * Fetches a single meeting by ID.
 * Automatically polls every 3 seconds while the meeting is still processing.
 * Stops polling once status is 'completed' or 'failed'.
 */
export function useMeeting(id: string | null) {
  return useQuery<Meeting, Error>({
    queryKey: meetingKeys.detail(id ?? ''),
    queryFn: () => meetingsApi.getById(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const isTerminal =
        status === MeetingStatus.Completed || status === MeetingStatus.Failed;
      return isTerminal ? false : 3000; // poll every 3s until done
    },
  });
}

// ── useMeetings ───────────────────────────────────────────────────────────────

/**
 * Fetches the full list of past meetings.
 * Used by the history panel.
 */
export function useMeetings() {
  return useQuery<Meeting[], Error>({
    queryKey: meetingKeys.all,
    queryFn: meetingsApi.getAll,
  });
}

// ── useDeleteMeeting ──────────────────────────────────────────────────────────

/**
 * Deletes a meeting by ID.
 * On success:
 *  - removes the detail cache entry so stale data is never shown
 *  - invalidates the list cache so the history sidebar refreshes
 * Accepts an optional onSuccess callback so the parent can clear the
 * active selection when the currently-viewed meeting is deleted.
 */
export function useDeleteMeeting(onSuccess?: (id: string) => void) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => meetingsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: meetingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      showToast('Meeting deleted successfully!', 'success');
      onSuccess?.(id);
    },
    onError: (err) => {
      showToast(err.message || 'Failed to delete meeting.', 'error');
    },
  });
}
