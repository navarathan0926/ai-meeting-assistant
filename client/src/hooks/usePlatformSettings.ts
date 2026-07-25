'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformSettingsApi } from '@/lib/api/platform-settings.api';
import { getUserFacingErrorMessage } from '@/lib/api/auth-errors';
import { PlatformSettings } from '@/types/platform-settings';
import { useToast } from '@/providers/ToastProvider';

export const platformSettingsKeys = {
  all: ['platform-settings'] as const,
};

export function usePlatformSettings() {
  return useQuery<PlatformSettings, Error>({
    queryKey: platformSettingsKeys.all,
    queryFn: () => platformSettingsApi.get(),
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<PlatformSettings, Error, boolean>({
    mutationFn: (allowPublicSignup) =>
      platformSettingsApi.update(allowPublicSignup),
    onSuccess: (settings) => {
      void queryClient.invalidateQueries({ queryKey: platformSettingsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['auth-config'] });
      showToast(
        settings.allowPublicSignup
          ? 'Public signup enabled.'
          : 'Public signup disabled.',
        'success',
      );
    },
    onError: (err) => {
      showToast(getUserFacingErrorMessage(err, 'Failed to update platform settings.'), 'error');
    },
  });
}
