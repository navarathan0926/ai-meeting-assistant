import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/QueryProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Meeting Assistant',
  description:
    'Upload meeting recordings and get AI-powered transcriptions and summaries.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={{
        fontFamily: 'Geist, system-ui, -apple-system, sans-serif',
        // Support custom variables in css
        ['--font-geist-sans' as any]: 'Geist, system-ui, sans-serif',
        ['--font-geist-mono' as any]: 'Geist Mono, monospace',
      }}
    >
      <body className="min-h-full flex flex-col">
        {/* QueryProvider must wrap everything that uses React Query hooks */}
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

