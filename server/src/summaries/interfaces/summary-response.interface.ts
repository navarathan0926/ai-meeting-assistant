/**
 * SummaryResponse
 * Client-facing shape of a GPT-generated meeting summary.
 */
export interface SummaryResponse {
  id: string;
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  createdAt: Date;
}
