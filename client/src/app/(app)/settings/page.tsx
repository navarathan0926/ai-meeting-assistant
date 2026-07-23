'use client';

import { ProjectContextSettings } from '@/components/settings/ProjectContextSettings';
import { JiraConfigSettings } from '@/components/settings/JiraConfigSettings';

export default function SettingsPage() {
  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-white/90">Settings</h2>
          <p className="mt-1 text-sm text-white/45">
            Configure your organization Jira account and project AI context.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide mb-4">
            Jira credentials
          </h3>
          <JiraConfigSettings />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide mb-4">
            Jira project AI context
          </h3>
          <ProjectContextSettings />
        </section>
      </div>
    </main>
  );
}
