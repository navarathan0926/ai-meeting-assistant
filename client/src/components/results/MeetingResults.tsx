import { Meeting, MeetingStatus } from '@/types/meeting';

interface MeetingResultsProps {
  meeting: Meeting;
}

/**
 * MeetingResults
 * Renders the transcript and AI-generated summary for a completed meeting.
 * Handles the 'failed' state with a clear error message.
 * Pure presentational component — no hooks, no side effects.
 */
export function MeetingResults({ meeting }: MeetingResultsProps) {
  if (meeting.status === MeetingStatus.Failed) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-900/20 p-6">
        <h2 className="text-red-400 font-semibold mb-2">Processing Failed</h2>
        <p className="text-white/60 text-sm">
          {meeting.errorMessage ?? 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
    );
  }

  if (meeting.status !== MeetingStatus.Completed) return null;

  const { transcription, summary, originalFileName } = meeting;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <h2 className="font-semibold text-white">{originalFileName}</h2>
          {transcription?.durationSeconds !== undefined && transcription?.durationSeconds !== null && (
            <p className="text-white/40 text-xs mt-0.5">
              Duration: {formatDuration(transcription.durationSeconds)}
            </p>
          )}
        </div>
      </div>

      {/* ── Audio player ─────────────────────────────────────────────── */}
      {meeting.audioUrl && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <SectionTitle icon="🎧" title="Recording" />
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls className="mt-3 w-full" src={meeting.audioUrl} />
        </section>
      )}

      {/* ── Summary overview ────────────────────────────────────────── */}
      {summary && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <SectionTitle icon="📋" title="Summary" />
          <p className="text-white/80 text-sm leading-relaxed mt-3">
            {summary.overview}
          </p>
        </section>
      )}

      {/* ── Key points ──────────────────────────────────────────────── */}
      {summary && summary.keyPoints.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <SectionTitle icon="🔑" title="Key Points" />
          <ul className="mt-3 flex flex-col gap-2">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/75">
                <span className="text-indigo-400 shrink-0">•</span>
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Action items ─────────────────────────────────────────────── */}
      {summary && summary.actionItems.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <SectionTitle icon="✅" title="Action Items" />
          <ul className="mt-3 flex flex-col gap-2">
            {summary.actionItems.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/75">
                <span className="text-emerald-400 shrink-0">{i + 1}.</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Full transcript ──────────────────────────────────────────── */}
      {transcription && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <SectionTitle icon="📝" title="Full Transcript" />
          <div className="mt-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">
              {transcription.text}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide">
        {title}
      </h3>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}
