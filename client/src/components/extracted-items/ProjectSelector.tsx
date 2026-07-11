'use client';

import { JiraProject } from '@/types/jira-project';

interface ProjectSelectorProps {
  projects: JiraProject[];
  value: string;
  disabled?: boolean;
  needsAttention?: boolean;
  onChange: (projectKey: string) => void;
}

export function ProjectSelector({
  projects,
  value,
  disabled,
  needsAttention,
  onChange,
}: ProjectSelectorProps) {
  return (
    <label className="flex flex-col gap-1 text-xs text-white/50">
      Jira project
      <select
        value={value}
        disabled={disabled || projects.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50 ${
          needsAttention
            ? 'border-amber-400/60 ring-1 ring-amber-400/30'
            : 'border-white/10'
        }`}
      >
        <option value="" className="bg-[#111]">
          Select a project…
        </option>
        {projects.map((project) => (
          <option key={project.key} value={project.key} className="bg-[#111]">
            {project.key} — {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
