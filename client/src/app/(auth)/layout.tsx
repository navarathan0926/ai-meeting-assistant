import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication — AI Meeting Assistant',
  description: 'Sign in or create an account to use the AI Meeting Assistant.',
};

/**
 * Auth layout — fullscreen dark canvas with no app chrome.
 * Isolated from the main layout so there is no sidebar / navbar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
