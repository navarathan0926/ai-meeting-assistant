'use client';

import { useCallback, useState, useEffect } from 'react';
import { MeetingStatus } from '@/types/meeting';
import { useUploadMeeting, useMeeting } from '@/hooks/useMeeting';
import { useToast } from '@/providers/ToastProvider';

interface AudioUploadProps {
  /** Called when processing finishes (completed or failed) */
  onComplete?: (meetingId: string) => void;
}

const ACCEPTED_TYPES = [
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm',
  'audio/ogg', 'audio/x-m4a', 'video/mp4',
];
const MAX_SIZE_MB = 25;

/**
 * AudioUpload
 * Drag-and-drop (or click-to-browse) audio uploader.
 * Shows live processing progress by polling the meeting status.
 */
export function AudioUpload({ onComplete }: AudioUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [toastShownForId, setToastShownForId] = useState<string | null>(null);

  const { showToast } = useToast();
  const upload = useUploadMeeting();
  const { data: meeting } = useMeeting(meetingId);

  // ── File validation ────────────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Unsupported format. Use MP3, MP4, WAV, WebM, OGG, or M4A.';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        setSelectedFile(null);
        return;
      }
      setValidationError(null);
      setSelectedFile(file);
    },
    [],
  );

  // ── Drag events ────────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Upload action ──────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      const created = await upload.mutateAsync(selectedFile);
      setMeetingId(created.id);
      showToast('Recording uploaded! Processing started...', 'success');
      // onComplete fires when the polling hook sees a terminal status
    } catch (err) {
      showToast((err as Error).message || 'Failed to upload recording.', 'error');
    }
  };

  // ── Notify parent when done ────────────────────────────────────────
  useEffect(() => {
    if (
      meetingId &&
      meeting &&
      (meeting.status === MeetingStatus.Completed ||
        meeting.status === MeetingStatus.Failed)
    ) {
      if (toastShownForId !== meetingId) {
        setToastShownForId(meetingId);
        if (meeting.status === MeetingStatus.Completed) {
          showToast('Meeting processing completed successfully!', 'success');
        } else {
          showToast(meeting.errorMessage || 'Meeting processing failed.', 'error');
        }
      }
      onComplete?.(meetingId);
    }
  }, [meetingId, meeting, onComplete, toastShownForId, showToast]);

  // ── Derived state ──────────────────────────────────────────────────
  const isUploading = upload.isPending;
  const isProcessing =
    meeting?.status === MeetingStatus.Processing ||
    meeting?.status === MeetingStatus.Pending;
  const isBusy = isUploading || isProcessing;

  const statusLabel: Record<MeetingStatus, string> = {
    [MeetingStatus.Pending]: 'Queued for processing…',
    [MeetingStatus.Processing]: 'Transcribing & summarising…',
    [MeetingStatus.Completed]: 'Done!',
    [MeetingStatus.Failed]: meeting?.errorMessage ?? 'Processing failed.',
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Drop zone */}
      <label
        htmlFor="audio-input"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'flex flex-col items-center justify-center gap-3 w-full min-h-52',
          'rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200',
          'text-center px-6 py-10',
          isBusy
            ? 'cursor-not-allowed opacity-60 border-indigo-300 bg-indigo-950/20'
            : isDragging
            ? 'border-indigo-400 bg-indigo-900/30 scale-[1.01]'
            : selectedFile
            ? 'border-emerald-500 bg-emerald-900/20'
            : 'border-white/20 bg-white/5 hover:border-indigo-400 hover:bg-indigo-900/20',
        ].join(' ')}
      >
        <input
          id="audio-input"
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          disabled={isBusy}
          onChange={onInputChange}
        />

        {/* Icon */}
        <div className="text-5xl">
          {selectedFile ? '🎙️' : isDragging ? '📂' : '☁️'}
        </div>

        {selectedFile ? (
          <>
            <p className="text-emerald-400 font-semibold text-sm">
              {selectedFile.name}
            </p>
            <p className="text-white/40 text-xs">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </>
        ) : (
          <>
            <p className="text-white/70 font-medium">
              Drag & drop your audio file here
            </p>
            <p className="text-white/40 text-sm">
              or click to browse — MP3, MP4, WAV, WebM, OGG, M4A (max 25 MB)
            </p>
          </>
        )}
      </label>

      {/* Validation error */}
      {validationError && (
        <p className="text-red-400 text-sm text-center">{validationError}</p>
      )}

      {/* Upload error */}
      {upload.isError && (
        <p className="text-red-400 text-sm text-center">
          {(upload.error as Error).message}
        </p>
      )}

      {/* Status badge */}
      {meetingId && meeting && (
        <div
          className={[
            'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium',
            meeting.status === MeetingStatus.Completed
              ? 'bg-emerald-900/40 text-emerald-400'
              : meeting.status === MeetingStatus.Failed
              ? 'bg-red-900/40 text-red-400'
              : 'bg-indigo-900/40 text-indigo-300',
          ].join(' ')}
        >
          {isProcessing && (
            <span className="inline-block h-3 w-3 rounded-full bg-indigo-400 animate-ping" />
          )}
          {statusLabel[meeting.status]}
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !meetingId && (
        <button
          id="upload-btn"
          onClick={handleUpload}
          disabled={isBusy}
          className={[
            'w-full rounded-xl py-3 px-6 font-semibold text-sm transition-all duration-200',
            isBusy
              ? 'bg-indigo-800 cursor-not-allowed text-indigo-400'
              : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-900/40',
          ].join(' ')}
        >
          {isUploading ? 'Uploading…' : 'Upload & Process'}
        </button>
      )}

      {/* Reset after completion */}
      {meeting?.status === MeetingStatus.Completed && (
        <button
          onClick={() => {
            setSelectedFile(null);
            setMeetingId(null);
            upload.reset();
          }}
          className="text-white/40 hover:text-white/70 text-sm underline transition-colors"
        >
          Upload another recording
        </button>
      )}
    </div>
  );
}
