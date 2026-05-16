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
  status: MeetingStatus;
  errorMessage?: string;
  transcription?: Transcription;
  summary?: Summary;
  createdAt: string;
  updatedAt: string;
}

// ── API response envelope (matches server's TransformInterceptor) ─────────────

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}
