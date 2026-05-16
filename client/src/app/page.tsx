'use client';

import { useState } from 'react';
import { AudioUpload } from '@/components/upload/AudioUpload';
import { MeetingResults } from '@/components/results/MeetingResults';
import { MeetingHistory } from '@/components/history/MeetingHistory';
import { useMeeting } from '@/hooks/useMeeting';

/**
 * Home page — the entry point of the AI Meeting Assistant.
 *
 * Layout:
 *  Left panel  — meeting history list
 *  Right panel — upload zone + results
 */
export default function HomePage() {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const { data: activeMeeting } = useMeeting(activeMeetingId);

  return (
    <div className="min-h-screen bg-[#09090f] text-white flex flex-col">
      {/* ── Top nav ────────────────────────────────────────────────── */}
      <header className="border-b border-white/8 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🎙️</span>
        <h1 className="font-bold text-lg tracking-tight">AI Meeting Assistant</h1>
        <span className="ml-auto text-xs text-white/30 font-mono">Phase 1 MVP</span>
      </header>

      {/* ── Main layout ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar — history */}
        <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-white/8 p-4 gap-4 overflow-y-auto">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-1">
            Past Meetings
          </p>
          <MeetingHistory
            activeMeetingId={activeMeetingId}
            onSelect={setActiveMeetingId}
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
