/**
 * TranscriptionResponse
 * Client-facing shape of a transcription result.
 */
export interface TranscriptionResponse {
  id: string;
  text: string;
  durationSeconds?: number;
  createdAt: Date;
}
