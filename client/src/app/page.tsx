'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AudioUpload } from '@/components/upload/AudioUpload';
import { MeetingResults } from '@/components/results/MeetingResults';
import { MeetingHistory } from '@/components/history/MeetingHistory';
import { useMeeting } from '@/hooks/useMeeting';
import { useAuthContext } from '@/providers/AuthProvider';

/**
 * Home page — the entry point of the AI Meeting Assistant.
 *
 * Layout:
 *  Left panel  — meeting history list
 *  Right panel — upload zone + results
 */
export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthContext();
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const { data: activeMeeting } = useMeeting(activeMeetingId);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090f] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#39FF14]"></div>
          <p className="text-white/60 text-sm font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-white flex flex-col">
      {/* ── Top nav ────────────────────────────────────────────────── */}
      <header className="border-b border-white/8 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🎙️</span>
        <h1 className="font-bold text-lg tracking-tight">AI Meeting Assistant</h1>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-white/50 font-mono">
            Signed in as <span className="text-[#39FF14]">{user?.name}</span>
          </span>
          <button
            onClick={logout}
            className="text-xs bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded border border-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* Left sidebar — history */}
        <aside className="flex flex-col w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-white/8 p-4 gap-4 overflow-y-auto max-h-64 md:max-h-none">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-1">
            Past Meetings
          </p>
          <MeetingHistory
            activeMeetingId={activeMeetingId}
            onSelect={setActiveMeetingId}
            onDelete={(id) => {
              // If the deleted meeting is the one being viewed, clear the panel
              if (activeMeetingId === id) setActiveMeetingId(null);
            }}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-2xl mx-auto flex flex-col gap-8">

            {/* Upload section */}
            <section>
              <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
                Upload Recording
              </h2>
              <AudioUpload onComplete={setActiveMeetingId} />
            </section>

            {/* Results section */}
            {activeMeeting && (
              <section>
                <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
                  Results
                </h2>
                <MeetingResults meeting={activeMeeting} />
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
