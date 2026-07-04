import { EnvKey } from './env.keys';
import {
  buildJiraConfig,
  isJiraConfigured,
  requireJiraApiGatewayUrl,
} from './jira.config';

describe('jiraConfiguration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load Jira settings from env', () => {
    process.env[EnvKey.JiraApiGatewayUrl] = 'https://api.atlassian.com/ex/jira/';
    process.env[EnvKey.CloudId] = 'cloud-1';
    process.env[EnvKey.JiraApiKey] = 'token';
    process.env[EnvKey.JiraEmail] = 'user@example.com';
    process.env[EnvKey.JiraProjectKey] = 'PROJ';
    process.env[EnvKey.JiraBaseUrl] = 'https://example.atlassian.net/';

    const config = buildJiraConfig();

    expect(config.apiGatewayUrl).toBe('https://api.atlassian.com/ex/jira/');
    expect(isJiraConfigured(config)).toBe(true);
    expect(requireJiraApiGatewayUrl(config)).toBe(
      'https://api.atlassian.com/ex/jira',
    );
  });

  it('should treat missing credentials as not configured', () => {
    delete process.env[EnvKey.CloudId];
    delete process.env[EnvKey.JiraApiKey];

    expect(isJiraConfigured(buildJiraConfig())).toBe(false);
  });
});
