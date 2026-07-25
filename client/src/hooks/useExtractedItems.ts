'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { extractedItemsApi } from '@/lib/api/extracted-items.api';
import { getUserFacingErrorMessage } from '@/lib/api/auth-errors';
import {
  ApproveExtractedItemResult,
  ExtractedItem,
  ExtractedItemStatus,
  normalizeExtractedItemDescription,
  UpdateExtractedItemPayload,
} from '@/types/extracted-item';
import { useToast } from '@/providers/ToastProvider';
import { useAuthContext } from '@/providers/AuthProvider';

export const extractedItemKeys = {
  byMeeting: (userId: string, meetingId: string) =>
    ['extracted-items', userId, meetingId] as const,
};

const EMPTY_POLL_DURATION_MS = 120_000;

export function useExtractedItems(meetingId: string | null) {
  const { user } = useAuthContext();
  const userId = user?.id ?? '';
  const pollDeadlineRef = useRef<number | null>(null);

  useEffect(() => {
    pollDeadlineRef.current =
      meetingId && userId ? Date.now() + EMPTY_POLL_DURATION_MS : null;
  }, [meetingId, userId]);

  return useQuery<ExtractedItem[], Error>({
    queryKey: extractedItemKeys.byMeeting(userId, meetingId ?? ''),
    queryFn: async () => {
      const items = await extractedItemsApi.listByMeeting(meetingId!);
      return items.map((entry) => ({
        ...entry,
        description: normalizeExtractedItemDescription(entry.description),
      }));
    },
    enabled: !!meetingId && !!userId,
    refetchInterval: (query) => {
      const items = query.state.data;
      if (items === undefined) {
        return 5000;
      }

      const hasApproved = items.some(
        (item) => item.status === ExtractedItemStatus.Approved,
      );
      if (hasApproved) {
        return 3000;
      }

      if (items.length > 0) {
        return false;
      }

      const deadline = pollDeadlineRef.current;
      if (deadline && Date.now() < deadline) {
        return 5000;
      }
      return false;
    },
  });
}

export function useUpdateExtractedItem(meetingId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  return useMutation<
    ExtractedItem,
    Error,
    { id: string; payload: UpdateExtractedItemPayload }
  >({
    mutationFn: ({ id, payload }) => extractedItemsApi.update(id, payload),
    onSuccess: (updatedItem) => {
      if (user?.id) {
        queryClient.setQueryData<ExtractedItem[]>(
          extractedItemKeys.byMeeting(user.id, meetingId),
          (items) =>
            items?.map((entry) =>
              entry.id === updatedItem.id
                ? {
                    ...updatedItem,
                    description: normalizeExtractedItemDescription(
                      updatedItem.description,
                    ),
                  }
                : entry,
            ) ?? [],
        );
      }
      showToast('Item updated.', 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to update item.'), 'error');
    },
  });
}

export function useRejectExtractedItem(meetingId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  return useMutation<ExtractedItem, Error, string>({
    mutationFn: (id) => extractedItemsApi.reject(id),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: extractedItemKeys.byMeeting(user.id, meetingId),
        });
      }
      showToast('Item rejected.', 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to reject item.'), 'error');
    },
  });
}

export function useApproveExtractedItem(meetingId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { showToast } = useToast();

  return useMutation<ApproveExtractedItemResult, Error, string>({
    mutationFn: (id) => extractedItemsApi.approve(id),
    onSuccess: (result) => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: extractedItemKeys.byMeeting(user.id, meetingId),
        });
      }
      if (result.jiraError) {
        showToast(
          `Could not send to Jira. Item returned to draft: ${result.jiraError}`,
          'error',
        );
        return;
      }
      if (result.status === ExtractedItemStatus.Sent && result.jiraIssueKey) {
        showToast(`Sent to Jira as ${result.jiraIssueKey}.`, 'success');
        return;
      }
      if (result.status === ExtractedItemStatus.Approved) {
        showToast('Sending to Jira…', 'success');
        return;
      }
      showToast('Item approved.', 'success');
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to approve item.'), 'error');
    },
  });
}
