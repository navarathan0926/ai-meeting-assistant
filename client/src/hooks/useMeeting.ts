import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '@/lib/api/meetings.api';
import { Meeting, MeetingStatus } from '@/types/meeting';

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
