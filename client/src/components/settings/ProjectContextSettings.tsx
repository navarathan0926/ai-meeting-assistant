'use client';

import { useEffect, useState } from 'react';
import {
  useJiraProjects,
  useUpdateProjectContext,
} from '@/hooks/useJiraProjects';
import { JiraProject } from '@/types/jira-project';

export function ProjectContextSettings() {
  const { data: projects, isLoading, isError, error, refetch } = useJiraProjects();
  const updateMutation = useUpdateProjectContext();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!projects) {
      return;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      for (const project of projects) {
        if (!(project.key in next)) {
          next[project.key] = project.aiContext ?? '';
        }
      }
      return next;
    });
  }, [projects]);

  if (isLoading) {
    return <p className="text-sm text-white/50">Loading Jira projects…</p>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
        {error.message || 'Failed to load Jira projects.'}
        <button
          type="button"
          onClick={() => void refetch()}
          className="ml-3 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <p className="text-sm text-white/50">
        No Jira projects found. Check Jira credentials and try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-white/55">
        Short AI context helps extraction route work items to the right project.
        Prefer a clear blurb over relying on Jira&apos;s description field.
      </p>
      {projects.map((project) => (
        <ProjectContextCard
          key={project.key}
          project={project}
          value={drafts[project.key] ?? ''}
          disabled={updateMutation.isPending}
          onChange={(value) =>
            setDrafts((prev) => ({ ...prev, [project.key]: value }))
          }
          onSave={() =>
            updateMutation.mutate({
              key: project.key,
              aiContext: drafts[project.key] ?? '',
            })
          }
        />
      ))}
    </div>
  );
}

function ProjectContextCard({
  project,
  value,
  disabled,
  onChange,
  onSave,
}: {
  project: JiraProject;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const dirty = value.trim() !== (project.aiContext ?? '').trim();

  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-baseline gap-2 mb-2">
        <h3 className="text-sm font-semibold text-white/90">{project.key}</h3>
        <span className="text-xs text-white/45">{project.name}</span>
      </div>
      {project.description ? (
        <p className="mb-2 text-xs text-white/35">
          Jira description: {project.description}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-xs text-white/50">
        AI context
        <textarea
          value={value}
          disabled={disabled}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What this project is about, for the extraction model…"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50 resize-y"
        />
      </label>
      <div className="mt-3">
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={onSave}
          className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          Save context
        </button>
      </div>
    </article>
  );
}
