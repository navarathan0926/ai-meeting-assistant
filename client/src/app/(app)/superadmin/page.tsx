'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import {
  useCreateOrganization,
  useCreateOrganizationAdmin,
  useOrganizations,
  useReactivateOrganization,
  useSuspendOrganization,
} from '@/hooks/useOrganizations';
import { OrganizationSummary } from '@/types/organization';

export default function SuperAdminPage() {
  const router = useRouter();
  const { user, logout } = useAuthContext();
  const { data: organizations, isLoading, isError, error } = useOrganizations();
  const createOrg = useCreateOrganization();
  const suspendOrg = useSuspendOrganization();
  const reactivateOrg = useReactivateOrganization();
  const createAdmin = useCreateOrganizationAdmin();

  const [newOrgName, setNewOrgName] = useState('');
  const [adminOrgId, setAdminOrgId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  const busy =
    createOrg.isPending ||
    suspendOrg.isPending ||
    reactivateOrg.isPending ||
    createAdmin.isPending;

  const handleCreateOrg = () => {
    const name = newOrgName.trim();
    if (!name) {
      return;
    }
    createOrg.mutate({ name }, { onSuccess: () => setNewOrgName('') });
  };

  const handleCreateAdmin = (organizationId: string) => {
    createAdmin.mutate(
      {
        organizationId,
        payload: {
          email: adminEmail.trim(),
          name: adminName.trim(),
          password: adminPassword,
          role: 'ADMIN',
        },
      },
      {
        onSuccess: () => {
          setAdminOrgId(null);
          setAdminEmail('');
          setAdminName('');
          setAdminPassword('');
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-[#09090f] text-white flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/8 px-6 py-4 flex items-center gap-3 bg-[#09090f]/95 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90">
          <span className="text-2xl">🎙️</span>
          <h1 className="font-bold text-lg tracking-tight">Platform Admin</h1>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-white/50 font-mono hidden sm:inline">
            {user.name}
            <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-200">
              SUPERADMIN
            </span>
          </span>
          <button
            onClick={() => void logout()}
            className="text-xs bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded border border-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-semibold text-white/90">Organizations</h2>
            <p className="mt-1 text-sm text-white/45">
              Manage tenants, suspend access, and provision the first admin for new orgs.
            </p>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide mb-4">
              Create organization
            </h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newOrgName}
                disabled={busy}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Organization name"
                className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              />
              <button
                type="button"
                disabled={busy || !newOrgName.trim()}
                onClick={handleCreateOrg}
                className="rounded-lg bg-emerald-600/80 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide mb-4">
              All organizations
            </h3>

            {isLoading ? (
              <p className="text-sm text-white/50">Loading organizations…</p>
            ) : null}

            {isError ? (
              <p className="text-sm text-red-200">
                {error.message || 'Failed to load organizations.'}
              </p>
            ) : null}

            {organizations && organizations.length === 0 ? (
              <p className="text-sm text-white/50">No organizations yet.</p>
            ) : null}

            {organizations && organizations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-white/45 border-b border-white/10">
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Meetings</th>
                      <th className="py-2 pr-4 font-medium">Items</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <OrganizationRow
                        key={org.id}
                        org={org}
                        busy={busy}
                        adminOrgId={adminOrgId}
                        adminEmail={adminEmail}
                        adminName={adminName}
                        adminPassword={adminPassword}
                        onToggleAdminForm={setAdminOrgId}
                        onAdminEmailChange={setAdminEmail}
                        onAdminNameChange={setAdminName}
                        onAdminPasswordChange={setAdminPassword}
                        onSuspend={(id) => suspendOrg.mutate(id)}
                        onReactivate={(id) => reactivateOrg.mutate(id)}
                        onCreateAdmin={handleCreateAdmin}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

function OrganizationRow({
  org,
  busy,
  adminOrgId,
  adminEmail,
  adminName,
  adminPassword,
  onToggleAdminForm,
  onAdminEmailChange,
  onAdminNameChange,
  onAdminPasswordChange,
  onSuspend,
  onReactivate,
  onCreateAdmin,
}: {
  org: OrganizationSummary;
  busy: boolean;
  adminOrgId: string | null;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  onToggleAdminForm: (id: string | null) => void;
  onAdminEmailChange: (value: string) => void;
  onAdminNameChange: (value: string) => void;
  onAdminPasswordChange: (value: string) => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
  onCreateAdmin: (organizationId: string) => void;
}) {
  const showAdminForm = adminOrgId === org.id;

  return (
    <>
      <tr className="border-b border-white/5 align-top">
        <td className="py-3 pr-4">
          <div className="font-medium text-white/90">{org.name}</div>
          <div className="text-xs text-white/35 font-mono mt-1">{org.id}</div>
        </td>
        <td className="py-3 pr-4">
          <span
            className={`rounded px-2 py-0.5 text-xs uppercase ${
              org.status === 'active'
                ? 'bg-emerald-500/15 text-emerald-200'
                : 'bg-red-500/15 text-red-200'
            }`}
          >
            {org.status}
          </span>
        </td>
        <td className="py-3 pr-4 text-white/70">{org.meetingCount}</td>
        <td className="py-3 pr-4 text-white/70">{org.extractedItemCount}</td>
        <td className="py-3">
          <div className="flex flex-wrap gap-2">
            {org.isActive ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onSuspend(org.id)}
                className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-200 hover:bg-red-900/20 disabled:opacity-50"
              >
                Suspend
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => onReactivate(org.id)}
                className="rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-900/20 disabled:opacity-50"
              >
                Reactivate
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggleAdminForm(showAdminForm ? null : org.id)}
              className="rounded border border-white/15 px-2 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              {showAdminForm ? 'Cancel admin' : 'Add admin'}
            </button>
          </div>
        </td>
      </tr>
      {showAdminForm ? (
        <tr className="border-b border-white/10">
          <td colSpan={5} className="py-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 grid gap-3 md:grid-cols-3">
              <input
                type="email"
                value={adminEmail}
                disabled={busy}
                onChange={(e) => onAdminEmailChange(e.target.value)}
                placeholder="Admin email"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              />
              <input
                type="text"
                value={adminName}
                disabled={busy}
                onChange={(e) => onAdminNameChange(e.target.value)}
                placeholder="Admin name"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              />
              <input
                type="password"
                value={adminPassword}
                disabled={busy}
                onChange={(e) => onAdminPasswordChange(e.target.value)}
                placeholder="Temporary password"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              />
              <button
                type="button"
                disabled={
                  busy ||
                  !adminEmail.trim() ||
                  !adminName.trim() ||
                  adminPassword.length < 8
                }
                onClick={() => onCreateAdmin(org.id)}
                className="md:col-span-3 w-fit rounded-lg bg-emerald-600/80 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Create admin user
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
