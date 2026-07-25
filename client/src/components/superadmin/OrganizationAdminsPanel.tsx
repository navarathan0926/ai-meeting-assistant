'use client';

import { useState } from 'react';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { getUserFacingErrorMessage } from '@/lib/api/auth-errors';
import {
  useDeleteOrganizationAdmin,
  useOrganizationAdmins,
  useReactivateOrganizationAdmin,
  useSuspendOrganizationAdmin,
} from '@/hooks/useOrganizations';
import { OrganizationAdminSummary } from '@/types/organization';

interface OrganizationAdminsPanelProps {
  organizationId: string;
  disabled?: boolean;
}

export function OrganizationAdminsPanel({
  organizationId,
  disabled = false,
}: OrganizationAdminsPanelProps) {
  const { data: admins = [], isLoading, isError, error } =
    useOrganizationAdmins(organizationId);
  const suspendMutation = useSuspendOrganizationAdmin(organizationId);
  const reactivateMutation = useReactivateOrganizationAdmin(organizationId);
  const deleteMutation = useDeleteOrganizationAdmin(organizationId);
  const [pendingDelete, setPendingDelete] = useState<OrganizationAdminSummary | null>(
    null,
  );

  const busy =
    disabled ||
    suspendMutation.isPending ||
    reactivateMutation.isPending ||
    deleteMutation.isPending;

  if (isLoading) {
    return <p className="text-sm text-white/50">Loading admins…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-200">
        {getUserFacingErrorMessage(error, 'Could not load admins. Please try again.')}
      </p>
    );
  }

  if (admins.length === 0) {
    return (
      <p className="text-sm text-white/50">
        No admins yet. Use &quot;Add admin&quot; to provision one.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/45">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-white/5 text-white/80">
                <td className="py-2 pr-4">{admin.name}</td>
                <td className="py-2 pr-4 font-mono text-xs">{admin.email}</td>
                <td className="py-2 pr-4">
                  {admin.isActive ? (
                    <span className="text-emerald-300">Active</span>
                  ) : (
                    <span className="text-amber-300">Suspended</span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-2">
                    {admin.isActive ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => suspendMutation.mutate(admin.id)}
                        className="rounded border border-amber-400/30 px-2 py-1 text-xs text-amber-200 hover:bg-amber-900/20 disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => reactivateMutation.mutate(admin.id)}
                        className="rounded border border-emerald-400/30 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-900/20 disabled:opacity-50"
                      >
                        Reactivate
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPendingDelete(admin)}
                      className="rounded border border-red-400/30 px-2 py-1 text-xs text-red-200 hover:bg-red-900/20 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={Boolean(pendingDelete)}
        title="Delete admin?"
        message={
          pendingDelete ? (
            <>
              Permanently delete admin <strong>{pendingDelete.email}</strong>? Their
              meetings will also be removed.
            </>
          ) : null
        }
        confirmLabel="Delete admin"
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
    </>
  );
}
