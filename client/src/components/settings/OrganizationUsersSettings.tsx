'use client';

import { FormEvent, useState } from 'react';
import {
  useCreateOrganizationUser,
  useDeleteOrganizationUser,
  useOrganizationUsers,
  useReactivateOrganizationUser,
  useSuspendOrganizationUser,
} from '@/hooks/useOrganizationUsers';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { getUserFacingErrorMessage } from '@/lib/api/auth-errors';
import { OrganizationUserSummary } from '@/types/organization';
import { UserRole } from '@/types/auth';

export function OrganizationUsersSettings() {
  const { data: users = [], isLoading, isError, error } = useOrganizationUsers();
  const createMutation = useCreateOrganizationUser();
  const suspendMutation = useSuspendOrganizationUser();
  const reactivateMutation = useReactivateOrganizationUser();
  const deleteMutation = useDeleteOrganizationUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingDelete, setPendingDelete] = useState<OrganizationUserSummary | null>(
    null,
  );

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        password,
      },
      {
        onSuccess: () => {
          setName('');
          setEmail('');
          setPassword('');
        },
      },
    );
  };

  const busy =
    createMutation.isPending ||
    suspendMutation.isPending ||
    reactivateMutation.isPending ||
    deleteMutation.isPending;

  if (isLoading) {
    return <p className="text-sm text-white/50">Loading organization users…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-200">
        {getUserFacingErrorMessage(error, 'Could not load your team. Please try again.')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-col gap-3" autoComplete="off">
        <p className="text-sm text-white/55">
          Create USER accounts for your organization. Public self-registration is
          disabled when platform signup is off.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-white/50">
            Name
            <input
              type="text"
              value={name}
              disabled={busy}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/50">
            Email
            <input
              type="email"
              value={email}
              disabled={busy}
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              required
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs text-white/50">
          Temporary password
          <input
            type="password"
            value={password}
            disabled={busy}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="self-start rounded-lg bg-[#39FF14] px-4 py-2 text-sm font-semibold text-black hover:bg-[#32e612] disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating…' : 'Create user'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/45">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/5 text-white/80">
                <td className="py-3 pr-4">{user.name}</td>
                <td className="py-3 pr-4 font-mono text-xs">{user.email}</td>
                <td className="py-3 pr-4">{user.role}</td>
                <td className="py-3 pr-4">
                  {user.isActive ? (
                    <span className="text-emerald-300">Active</span>
                  ) : (
                    <span className="text-amber-300">Suspended</span>
                  )}
                </td>
                <td className="py-3">
                  {user.role === UserRole.User ? (
                    <div className="flex flex-wrap gap-2">
                      {user.isActive ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => suspendMutation.mutate(user.id)}
                          className="rounded border border-amber-400/30 px-2 py-1 text-xs text-amber-200 hover:bg-amber-900/20 disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => reactivateMutation.mutate(user.id)}
                          className="rounded border border-emerald-400/30 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-900/20 disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPendingDelete(user)}
                        className="rounded border border-red-400/30 px-2 py-1 text-xs text-red-200 hover:bg-red-900/20 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-white/35">Managed by platform</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">No users in this organization yet.</p>
        ) : null}
      </div>

      <ConfirmationModal
        isOpen={Boolean(pendingDelete)}
        title="Delete user?"
        message={
          pendingDelete ? (
            <>
              Permanently delete <strong>{pendingDelete.email}</strong>? Their meetings
              will also be removed.
            </>
          ) : null
        }
        confirmLabel="Delete user"
        confirmingLabel="Deleting…"
        isConfirming={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }
          deleteMutation.mutate(pendingDelete.id, {
            onSuccess: () => setPendingDelete(null),
          });
        }}
      />
    </div>
  );
}
