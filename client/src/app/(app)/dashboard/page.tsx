'use client';

import { useState } from 'react';
import { AudioUpload } from '@/components/upload/AudioUpload';
import { MeetingResults } from '@/components/results/MeetingResults';
import { MeetingAudioPlayer } from '@/components/results/MeetingAudioPlayer';
import { ExtractedItemsReview } from '@/components/extracted-items/ExtractedItemsReview';
import { MeetingHistory } from '@/components/history/MeetingHistory';
import { useMeeting } from '@/hooks/useMeeting';
import { MeetingStatus } from '@/types/meeting';

export default function DashboardPage() {
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const { data: activeMeeting } = useMeeting(activeMeetingId);

  return (
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

          {activeMeeting ? (
            <section>
              {activeMeeting.status === MeetingStatus.Completed &&
                activeMeeting.audioUrl ? (
                  <MeetingAudioPlayer
                    audioUrl={activeMeeting.audioUrl}
                    fileName={activeMeeting.originalFileName}
                  />
                ) : null}

              <h2 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4 mt-6">
                Results
              </h2>
              <MeetingResults meeting={activeMeeting} />
              {activeMeeting.status === MeetingStatus.Completed ? (
                <ExtractedItemsReview
                  meetingId={activeMeeting.id}
                  meetingStatus={activeMeeting.status}
                  extractionAnalysis={activeMeeting.extractionAnalysis}
                />
              ) : null}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
