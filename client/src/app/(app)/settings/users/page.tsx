'use client';

import { OrganizationUsersSettings } from '@/components/settings/OrganizationUsersSettings';

export default function OrganizationUsersPage() {
  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-white/90">Organization users</h2>
          <p className="mt-1 text-sm text-white/45">
            Create and manage USER accounts for your organization.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <OrganizationUsersSettings />
        </section>
      </div>
    </main>
  );
}
