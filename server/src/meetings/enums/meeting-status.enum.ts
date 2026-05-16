/**
 * MeetingStatus
 * Tracks the lifecycle of a meeting record from upload to completion.
 */
export enum MeetingStatus {
  /** File received, waiting for processing to begin */
  PENDING = 'pending',

  /** Transcription and/or summarization is in progress */
  PROCESSING = 'processing',

  /** All AI processing finished successfully */
  COMPLETED = 'completed',

  /** Processing failed; see meeting.errorMessage for details */
  FAILED = 'failed',
}
