import { EnvKey } from './env.keys';
import { requireEnv } from './env.helpers';
import { openAiConfiguration } from './openai.config';

describe('openAiConfiguration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load all OpenAI settings from env', () => {
    process.env[EnvKey.OpenAiApiKey] = 'sk-test';
    process.env[EnvKey.OpenAiGptModel] = 'gpt-4o-mini';
    process.env[EnvKey.OpenAiWhisperModel] = 'whisper-1';
    process.env[EnvKey.OpenAiExtractionModel] = 'gpt-4o';

    const config = openAiConfiguration();

    expect(config.apiKey).toBe('sk-test');
    expect(config.gptModel).toBe('gpt-4o-mini');
    expect(config.whisperModel).toBe('whisper-1');
    expect(config.extractionModel).toBe('gpt-4o');
  });

  it('should throw when a required OpenAI env var is missing', () => {
    process.env[EnvKey.OpenAiApiKey] = 'sk-test';
    process.env[EnvKey.OpenAiGptModel] = 'gpt-4o-mini';
    process.env[EnvKey.OpenAiWhisperModel] = 'whisper-1';
    delete process.env[EnvKey.OpenAiExtractionModel];

    expect(() => openAiConfiguration()).toThrow(
      `Missing required environment variable "${EnvKey.OpenAiExtractionModel}"`,
    );
  });
});

describe('requireEnv', () => {
  it('should trim whitespace from values', () => {
    expect(requireEnv({ OPENAI_API_KEY: '  sk-test  ' }, EnvKey.OpenAiApiKey)).toBe(
      'sk-test',
    );
  });
});
