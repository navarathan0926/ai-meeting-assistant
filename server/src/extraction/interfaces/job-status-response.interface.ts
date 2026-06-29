export interface JobStatusResponse {
  jobId: string;
  state: string;
  progress: number | Record<string, unknown>;
  failedReason?: string;
  meetingId: string;
  attemptsMade: number;
}
