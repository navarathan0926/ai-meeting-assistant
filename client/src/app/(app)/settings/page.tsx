'use client';

import Link from 'next/link';
import { ProjectContextSettings } from '@/components/settings/ProjectContextSettings';
import { useAuthContext } from '@/providers/AuthProvider';

export default function SettingsPage() {
  const { user, logout } = useAuthContext();

  return (
    <div className="min-h-screen bg-[#09090f] text-white flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/8 px-6 py-4 flex items-center gap-3 bg-[#09090f]/95 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90">
          <span className="text-2xl">🎙️</span>
          <h1 className="font-bold text-lg tracking-tight">AI Meeting Assistant</h1>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-xs text-white/50 font-mono hidden sm:inline">
            Signed in as <span className="text-[#39FF14]">{user?.name}</span>
          </span>
          <button
            onClick={() => void logout()}
            className="text-xs bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded border border-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-semibold text-white/90">Settings</h2>
            <p className="mt-1 text-sm text-white/45">
              Configure Jira project context used during item extraction.
            </p>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide mb-4">
              Jira project AI context
            </h3>
            <ProjectContextSettings />
          </section>
        </div>
      </main>
    </div>
  );
}
