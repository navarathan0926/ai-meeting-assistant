import type { Metadata } from 'next';
import { AppShellProviders } from '@/components/providers/AppShellProviders';

export const metadata: Metadata = {
  title: 'Authentication — AI Meeting Assistant',
  description: 'Sign in or create an account to use the AI Meeting Assistant.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShellProviders>
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        {children}
      </div>
    </AppShellProviders>
  );
}
