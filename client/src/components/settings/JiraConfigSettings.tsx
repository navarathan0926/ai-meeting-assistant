'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  useJiraConfig,
  useTestJiraConfig,
  useUpdateJiraConfig,
} from '@/hooks/useJiraConfig';

export function JiraConfigSettings() {
  const { data: config, isLoading, isError, error } = useJiraConfig();
  const updateMutation = useUpdateJiraConfig();
  const testMutation = useTestJiraConfig();

  const [cloudId, setCloudId] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');

  useEffect(() => {
    if (!config) {
      return;
    }
    setCloudId(config.jiraCloudId ?? '');
    setEmail(config.jiraEmail ?? '');
    setApiToken('');
  }, [config]);

  const buildPayload = () => ({
    jiraCloudId: cloudId.trim(),
    jiraEmail: email.trim(),
    ...(apiToken.trim() ? { jiraApiToken: apiToken.trim() } : {}),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateMutation.mutate(buildPayload());
    setApiToken('');
  };

  const handleTest = () => {
    testMutation.mutate(buildPayload());
  };

  const busy = updateMutation.isPending || testMutation.isPending;

  if (isLoading) {
    return <p className="text-sm text-white/50">Loading Jira configuration…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-200">
        {error.message || 'Failed to load Jira configuration.'}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-white/55">
        Credentials are encrypted in the database. Only organization admins can
        view or change them. The API token is never echoed after save.
      </p>

      {config?.configured ? (
        <p className="text-xs text-emerald-300/90 rounded-lg border border-emerald-500/20 bg-emerald-900/20 px-3 py-2">
          Token saved — leave the token field empty to keep the existing value.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Jira Cloud ID
        <input
          type="text"
          value={cloudId}
          disabled={busy}
          onChange={(e) => setCloudId(e.target.value)}
          placeholder="Atlassian cloud id"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        Jira account email
        <input
          type="email"
          value={email}
          disabled={busy}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="api-user@company.com"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-white/50">
        API token
        <input
          type="password"
          value={apiToken}
          disabled={busy}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder={config?.configured ? 'Leave blank to keep saved token' : 'Paste API token'}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
          autoComplete="new-password"
          required={!config?.configured}
        />
      </label>

      {config?.jiraAccountId ? (
        <p className="text-xs text-white/40">
          Verified account id: <span className="font-mono">{config.jiraAccountId}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleTest}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 disabled:opacity-50"
        >
          Test credentials
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          Save credentials
        </button>
      </div>
    </form>
  );
}
