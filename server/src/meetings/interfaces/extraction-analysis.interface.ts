export interface ExtractionAnalysis {
  hasActionableWork: boolean;
  projectRelevanceConfidence: number;
  summary: string;
  extractedAt: string;
  meetingRelevanceThreshold?: number;
  showNoWorkBanner?: boolean;
  showLowRelevanceWarning?: boolean;
}
