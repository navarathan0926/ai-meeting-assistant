import { ExtractionAnalysis } from './interfaces/extraction-analysis.interface';

export function buildExtractionAnalysisFlags(
  analysis: Pick<
    ExtractionAnalysis,
    'hasActionableWork' | 'projectRelevanceConfidence'
  >,
  meetingRelevanceThreshold: number,
): Pick<ExtractionAnalysis, 'showNoWorkBanner' | 'showLowRelevanceWarning'> {
  return {
    showNoWorkBanner:
      !analysis.hasActionableWork &&
      analysis.projectRelevanceConfidence >= meetingRelevanceThreshold,
    showLowRelevanceWarning:
      analysis.projectRelevanceConfidence < meetingRelevanceThreshold,
  };
}

/** Ensure banner flags exist using the stored or configured threshold. */
export function normalizeExtractionAnalysis(
  analysis: ExtractionAnalysis | null | undefined,
  configuredMeetingRelevanceThreshold: number,
): ExtractionAnalysis | null {
  if (!analysis) {
    return null;
  }

  const meetingRelevanceThreshold =
    analysis.meetingRelevanceThreshold ?? configuredMeetingRelevanceThreshold;

  const flags =
    typeof analysis.showNoWorkBanner === 'boolean' &&
    typeof analysis.showLowRelevanceWarning === 'boolean'
      ? {
          showNoWorkBanner: analysis.showNoWorkBanner,
          showLowRelevanceWarning: analysis.showLowRelevanceWarning,
        }
      : buildExtractionAnalysisFlags(analysis, meetingRelevanceThreshold);

  return {
    ...analysis,
    meetingRelevanceThreshold,
    ...flags,
  };
}
