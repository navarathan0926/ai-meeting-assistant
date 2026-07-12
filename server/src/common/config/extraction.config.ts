import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { readEnv } from './env.helpers';

export interface ExtractionConfig {
  extractionConfidenceThreshold: number;
  projectConfidenceThreshold: number;
  meetingRelevanceThreshold: number;
}

const DEFAULT_EXTRACTION_CONFIDENCE_THRESHOLD = 0.6;
const DEFAULT_PROJECT_CONFIDENCE_THRESHOLD = 0.6;
const DEFAULT_MEETING_RELEVANCE_THRESHOLD = 0.7;

function parseUnitInterval(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return fallback;
  }
  return parsed;
}

export function buildExtractionConfig(
  source: NodeJS.ProcessEnv = process.env,
): ExtractionConfig {
  return {
    extractionConfidenceThreshold: parseUnitInterval(
      readEnv(source, EnvKey.ExtractionConfidenceThreshold),
      DEFAULT_EXTRACTION_CONFIDENCE_THRESHOLD,
    ),
    projectConfidenceThreshold: parseUnitInterval(
      readEnv(source, EnvKey.ProjectConfidenceThreshold),
      DEFAULT_PROJECT_CONFIDENCE_THRESHOLD,
    ),
    meetingRelevanceThreshold: parseUnitInterval(
      readEnv(source, EnvKey.MeetingRelevanceThreshold),
      DEFAULT_MEETING_RELEVANCE_THRESHOLD,
    ),
  };
}

export const extractionConfiguration = registerAs('extraction', () =>
  buildExtractionConfig(),
);
