'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AudioUpload } from '@/components/upload/AudioUpload';
import { MeetingResults } from '@/components/results/MeetingResults';
import { MeetingAudioPlayer } from '@/components/results/MeetingAudioPlayer';
import { ExtractedItemsReview } from '@/components/extracted-items/ExtractedItemsReview';
import { MeetingHistory } from '@/components/history/MeetingHistory';
import { useMeeting } from '@/hooks/useMeeting';
import { useAuthContext } from '@/providers/AuthProvider';
import { MeetingStatus } from '@/types/meeting';

export default function DashboardPage() {
  const { user, logout } = useAuthContext();
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const { data: activeMeeting } = useMeeting(activeMeetingId);

  return (
    <div className="min-h-screen bg-[#09090f] text-white flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/8 px-6 py-4 flex items-center gap-3 bg-[#09090f]/95 backdrop-blur">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90">
          <span className="text-2xl">🎙️</span>
          <h1 className="font-bold text-lg tracking-tight">AI Meeting Assistant</h1>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {user?.role === 'SUPERADMIN' ? (
            <Link
              href="/superadmin"
              className="text-xs text-amber-200/80 hover:text-amber-100 transition-colors"
            >
              Platform admin
            </Link>
          ) : null}
          <Link
            href="/settings"
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            Settings
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

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <aside className="flex flex-col w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-white/8 p-4 gap-4 overflow-y-auto max-h-64 md:max-h-none">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider px-1">
            Past Meetings
          </p>
          <MeetingHistory
            activeMeetingId={activeMeetingId}
            onSelect={setActiveMeetingId}
            onDelete={(id) => {
              if (activeMeetingId === id) setActiveMeetingId(null);
            }}
          />
        </aside>

        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            <section>
              <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
                Upload Recording
              </h2>
              <AudioUpload onComplete={setActiveMeetingId} />
            </section>

            {activeMeeting && (
              <section>
                {activeMeeting.status === MeetingStatus.Completed &&
                  activeMeeting.audioUrl && (
                    <MeetingAudioPlayer
                      audioUrl={activeMeeting.audioUrl}
                      fileName={activeMeeting.originalFileName}
                    />
                  )}

                <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4 mt-6">
                  Results
                </h2>
                <MeetingResults meeting={activeMeeting} />
                {activeMeeting.status === MeetingStatus.Completed && (
                  <ExtractedItemsReview
                    meetingId={activeMeeting.id}
                    meetingStatus={activeMeeting.status}
                    extractionAnalysis={activeMeeting.extractionAnalysis}
                  />
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
