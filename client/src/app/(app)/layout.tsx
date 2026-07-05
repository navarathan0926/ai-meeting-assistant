'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShellProviders } from '@/components/providers/AppShellProviders';
import { useAuthContext } from '@/providers/AuthProvider';

function AppAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-bright" />
          <p className="text-white/60 text-sm font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShellProviders>
      <AppAuthGate>{children}</AppAuthGate>
    </AppShellProviders>
  );
}
