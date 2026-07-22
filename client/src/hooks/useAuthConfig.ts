'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAuthConfig } from '@/lib/api/auth';

export const authConfigKeys = {
  all: ['auth-config'] as const,
};

export function useAuthConfig() {
  return useQuery({
    queryKey: authConfigKeys.all,
    queryFn: fetchAuthConfig,
    staleTime: 60_000,
  });
}
