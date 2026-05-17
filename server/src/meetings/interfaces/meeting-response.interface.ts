import { MeetingStatus } from '../enums/meeting-status.enum';
import { TranscriptionResponse } from '../../transcriptions/interfaces/transcription-response.interface';
import { SummaryResponse } from '../../summaries/interfaces/summary-response.interface';

/**
 * MeetingResponse
 * Shape of the meeting object returned to the client.
 * Keeps the response contract decoupled from the entity definition.
 */
export interface MeetingResponse {
  id: string;
  originalFileName: string;
  title: string | null;
  status: MeetingStatus;
  errorMessage?: string;
  transcription?: TranscriptionResponse;
  summary?: SummaryResponse;
  createdAt: Date;
  updatedAt: Date;
}
