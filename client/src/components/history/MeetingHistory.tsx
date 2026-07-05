'use client';

import { useState } from 'react';
import { Meeting, MeetingStatus } from '@/types/meeting';
import { useDeleteMeeting, useMeetings } from '@/hooks/useMeeting';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

const statusBadge: Record<MeetingStatus, string> = {
  [MeetingStatus.Pending]: 'bg-yellow-900/40 text-yellow-400',
  [MeetingStatus.Processing]: 'bg-indigo-900/40 text-indigo-300',
  [MeetingStatus.Completed]: 'bg-emerald-900/40 text-emerald-400',
  [MeetingStatus.Failed]: 'bg-red-900/40 text-red-400',
};

interface MeetingHistoryProps {
  activeMeetingId?: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function MeetingHistory({
  activeMeetingId,
  onSelect,
  onDelete,
}: MeetingHistoryProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useMeetings(search);
  const meetings = data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search recordings…"
        aria-label="Search recordings"
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-indigo-500/50"
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-24 text-white/30 text-sm">
          Loading history…
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-white/30 text-sm">
          {search.trim() ? 'No matching meetings.' : 'No meetings yet.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {meetings.map((meeting) => (
            <MeetingHistoryItem
              key={meeting.id}
              meeting={meeting}
              isActive={meeting.id === activeMeetingId}
              onClick={() => onSelect(meeting.id)}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface MeetingHistoryItemProps {
  meeting: Meeting;
  isActive: boolean;
  onClick: () => void;
  onDelete?: (id: string) => void;
}

function MeetingHistoryItem({
  meeting,
  isActive,
  onClick,
  onDelete,
}: MeetingHistoryItemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate: deleteMeeting, isPending: isDeleting } = useDeleteMeeting(
    (id) => {
      setIsModalOpen(false);
      onDelete?.(id);
    },
  );

  const date = new Date(meeting.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const maxLength = 30;

  return (
    <li>
      <div
        className={[
          'group relative rounded-xl transition-all duration-150',
          isActive
            ? 'bg-indigo-600/30 border border-indigo-500/40'
            : 'hover:bg-white/5 border border-transparent',
        ].join(' ')}
      >
        <button onClick={onClick} className="w-full text-left px-4 py-3">
          <p className="text-white/85 text-sm font-medium truncate pr-6">
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

        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          aria-label="Delete meeting"
          className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md text-white/30 hover:text-red-400 hover:bg-red-400/10 disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          )}
        </button>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        title="Delete Recording"
        message={
          <>
            Are you sure you want to permanently delete &quot;
            {meeting.originalFileName.length > maxLength
              ? meeting.originalFileName.slice(0, maxLength) + '...'
              : meeting.originalFileName}
            &quot;?
            <br />
            <br />
            This will remove the audio file and all generated AI transcripts and
            summaries.
            <br />
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmingLabel="Deleting..."
        isConfirming={isDeleting}
        onConfirm={() => deleteMeeting(meeting.id)}
        onCancel={() => setIsModalOpen(false)}
      />
    </li>
  );
}
