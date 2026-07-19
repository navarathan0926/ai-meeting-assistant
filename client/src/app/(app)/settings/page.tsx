'use client';

import Link from 'next/link';
import { ProjectContextSettings } from '@/components/settings/ProjectContextSettings';
import { JiraConfigSettings } from '@/components/settings/JiraConfigSettings';
import { useAuthContext } from '@/providers/AuthProvider';

export default function SettingsPage() {
  const { user, logout } = useAuthContext();
  const isAdmin = user?.role === 'ADMIN';

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
            {user?.role && (
              <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-white/10 text-white/60">
                {user.role}
              </span>
            )}
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
              {isAdmin
                ? 'Configure your organization Jira account and project AI context.'
                : 'Jira settings are managed by organization admins.'}
            </p>
          </div>

          {isAdmin ? (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide mb-4">
                Jira credentials
              </h3>
              <JiraConfigSettings />
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide mb-4">
              Jira project AI context
            </h3>
            {isAdmin ? (
              <ProjectContextSettings />
            ) : (
              <p className="text-sm text-white/50">
                You do not have permission to edit Jira settings. Contact an admin
                if project context needs updating.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
