'use client';

/**
 * QueryProvider.tsx
 * Wraps the application in TanStack React Query's QueryClientProvider.
 * Must be a Client Component because it uses React context internally.
 *
 * Default staleTime / gcTime are set conservatively for the meeting
 * assistant use-case (data changes after uploads, not on a timer).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // useState ensures a new QueryClient is NOT created on every render
  // while still being scoped per-component-tree (important for SSR).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
