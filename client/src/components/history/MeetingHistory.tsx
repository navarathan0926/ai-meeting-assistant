'use client';

import { Meeting, MeetingStatus } from '@/types/meeting';
import { useMeetings } from '@/hooks/useMeeting';

const statusBadge: Record<MeetingStatus, string> = {
  [MeetingStatus.Pending]: 'bg-yellow-900/40 text-yellow-400',
  [MeetingStatus.Processing]: 'bg-indigo-900/40 text-indigo-300',
  [MeetingStatus.Completed]: 'bg-emerald-900/40 text-emerald-400',
  [MeetingStatus.Failed]: 'bg-red-900/40 text-red-400',
};

interface MeetingHistoryProps {
  activeMeetingId?: string | null;
  onSelect: (id: string) => void;
}

/**
 * MeetingHistory
 * Left-panel list of past meetings.
 * Clicking an item calls onSelect so the parent can show results.
 */
export function MeetingHistory({ activeMeetingId, onSelect }: MeetingHistoryProps) {
  const { data: meetings, isLoading } = useMeetings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24 text-white/30 text-sm">
        Loading history…
      </div>
    );
  }

  if (!meetings || meetings.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-white/30 text-sm">
        No meetings yet.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {meetings.map((meeting) => (
        <MeetingHistoryItem
          key={meeting.id}
          meeting={meeting}
          isActive={meeting.id === activeMeetingId}
          onClick={() => onSelect(meeting.id)}
        />
      ))}
    </ul>
  );
}

interface MeetingHistoryItemProps {
  meeting: Meeting;
  isActive: boolean;
  onClick: () => void;
}

function MeetingHistoryItem({ meeting, isActive, onClick }: MeetingHistoryItemProps) {
  const date = new Date(meeting.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li>
      <button
        onClick={onClick}
        className={[
          'w-full text-left rounded-xl px-4 py-3 transition-all duration-150',
          isActive
            ? 'bg-indigo-600/30 border border-indigo-500/40'
            : 'hover:bg-white/5 border border-transparent',
        ].join(' ')}
      >
        <p className="text-white/85 text-sm font-medium truncate">
          {meeting.originalFileName}
        </p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className="text-white/35 text-xs">{date}</span>
          <span
            className={`text-xs rounded-full px-2 py-0.5 font-medium ${statusBadge[meeting.status]}`}
          >
            {meeting.status}
          </span>
        </div>
      </button>
    </li>
  );
}
