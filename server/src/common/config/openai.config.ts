import { registerAs } from '@nestjs/config';
import { EnvKey } from './env.keys';
import { requireEnv } from './env.helpers';

export interface OpenAiConfig {
  apiKey: string;
  gptModel: string;
  whisperModel: string;
  extractionModel: string;
}

export const openAiConfiguration = registerAs(
  'openai',
  (): OpenAiConfig => ({
    apiKey: requireEnv(process.env, EnvKey.OpenAiApiKey),
    gptModel: requireEnv(process.env, EnvKey.OpenAiGptModel),
    whisperModel: requireEnv(process.env, EnvKey.OpenAiWhisperModel),
    extractionModel: requireEnv(process.env, EnvKey.OpenAiExtractionModel),
  }),
);
