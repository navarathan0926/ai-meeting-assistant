// ── Enums ────────────────────────────────────────────────────────────────────

export enum MeetingStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

// ── Sub-resource types ────────────────────────────────────────────────────────

export interface Transcription {
  id: string;
  text: string;
  durationSeconds?: number;
  createdAt: string;
}

export interface Summary {
  id: string;
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  createdAt: string;
}

// ── Meeting ───────────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  originalFileName: string;
  /** Time-limited URL to access the uploaded audio */
  audioUrl?: string;
  status: MeetingStatus;
  errorMessage?: string;
  transcription?: Transcription;
  summary?: Summary;
  createdAt: string;
  updatedAt: string;
}
