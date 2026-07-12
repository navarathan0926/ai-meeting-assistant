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

export interface ExtractionAnalysis {
  hasActionableWork: boolean;
  projectRelevanceConfidence: number;
  summary: string;
  extractedAt: string;
  meetingRelevanceThreshold?: number;
  showNoWorkBanner?: boolean;
  showLowRelevanceWarning?: boolean;
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
  extractionAnalysis?: ExtractionAnalysis | null;
  createdAt: string;
  updatedAt: string;
}
