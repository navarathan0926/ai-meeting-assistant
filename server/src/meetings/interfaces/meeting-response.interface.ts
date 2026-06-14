import { MeetingStatus } from '../enums/meeting-status.enum';
import { TranscriptionResponse } from '../../transcriptions/interfaces/transcription-response.interface';
import { SummaryResponse } from '../../summaries/interfaces/summary-response.interface';


export interface MeetingResponse {
  id: string;
  originalFileName: string;
  title: string | null;

  audioUrl?: string;
  status: MeetingStatus;
  errorMessage?: string;

  jobId?: string;
  transcription?: TranscriptionResponse;
  summary?: SummaryResponse;
  createdAt: Date;
  updatedAt: Date;
}

