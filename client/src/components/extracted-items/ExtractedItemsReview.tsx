'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ExtractedItem,
  ExtractedItemPriority,
  ExtractedItemStatus,
  ExtractedItemType,
  UpdateExtractedItemPayload,
} from '@/types/extracted-item';
import {
  useApproveExtractedItem,
  useExtractedItems,
  useRejectExtractedItem,
  useUpdateExtractedItem,
} from '@/hooks/useExtractedItems';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

interface ExtractedItemsReviewProps {
  meetingId: string;
}

type PendingAction = 'approve' | 'reject';

export function ExtractedItemsReview({ meetingId }: ExtractedItemsReviewProps) {
  const { data: items, isLoading, isFetching } = useExtractedItems(meetingId);

  if (isLoading || (isFetching && !items)) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <SectionTitle icon="🎯" title="Extracted Items" />
        <p className="mt-3 text-sm text-white/50">Loading extracted items…</p>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <SectionTitle icon="🎯" title="Extracted Items" />
        <p className="mt-3 text-sm text-white/50">
          No actionable items were extracted from this meeting yet. They may still
          be processing.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <SectionTitle icon="🎯" title="Extracted Items" />
      <p className="mt-2 text-xs text-white/40">
        Review, edit, and approve items before sending them to Jira.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {items.map((item) => (
          <ExtractedItemCard key={item.id} item={item} meetingId={meetingId} />
        ))}
      </div>
    </section>
  );
}

function ExtractedItemCard({
  item,
  meetingId,
}: {
  item: ExtractedItem;
  meetingId: string;
}) {
  const updateMutation = useUpdateExtractedItem(meetingId);
  const rejectMutation = useRejectExtractedItem(meetingId);
  const approveMutation = useApproveExtractedItem(meetingId);

  const [draft, setDraft] = useState({
    type: item.type,
    title: item.title,
    description: item.description,
    priority: item.priority,
  });
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    setDraft({
      type: item.type,
      title: item.title,
      description: item.description,
      priority: item.priority,
    });
  }, [item.type, item.title, item.description, item.priority, item.updatedAt]);

  const isEditable = item.status === ExtractedItemStatus.Draft;
  const isBusy =
    updateMutation.isPending ||
    rejectMutation.isPending ||
    approveMutation.isPending;

  const handleSave = () => {
    const payload: UpdateExtractedItemPayload = {};
    if (draft.type !== item.type) payload.type = draft.type;
    if (draft.title !== item.title) payload.title = draft.title;
    if (draft.description !== item.description) payload.description = draft.description;
    if (draft.priority !== item.priority) payload.priority = draft.priority;

    if (Object.keys(payload).length === 0) {
      return;
    }

    updateMutation.mutate({ id: item.id, payload });
  };

  const handleConfirmAction = () => {
    if (pendingAction === 'approve') {
      approveMutation.mutate(item.id, {
        onSettled: () => setPendingAction(null),
      });
      return;
    }

    if (pendingAction === 'reject') {
      rejectMutation.mutate(item.id, {
        onSettled: () => setPendingAction(null),
      });
    }
  };

  const closeModal = () => {
    if (!isBusy) {
      setPendingAction(null);
    }
  };

  const modalConfig =
    pendingAction === 'approve'
      ? {
          title: 'Send to Jira',
          message: (
            <>
              Approve &ldquo;{item.title}&rdquo; and create a Jira issue with the
              current details?
            </>
          ),
          confirmLabel: 'Approve & send',
          confirmingLabel: 'Sending…',
          variant: 'success' as const,
          isConfirming: approveMutation.isPending,
        }
      : pendingAction === 'reject'
        ? {
            title: 'Reject item',
            message: (
              <>
                Reject &ldquo;{item.title}&rdquo;? It will not be sent to Jira and
                cannot be approved later.
              </>
            ),
            confirmLabel: 'Reject',
            confirmingLabel: 'Rejecting…',
            variant: 'danger' as const,
            isConfirming: rejectMutation.isPending,
          }
        : null;

  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatusBadge status={item.status} />
        {item.jiraIssueKey && (
          <JiraLink issueKey={item.jiraIssueKey} url={item.jiraIssueUrl} />
        )}
      </div>

      <div className="grid gap-3">
        <label className="flex flex-col gap-1 text-xs text-white/50">
          Type
          <select
            value={draft.type}
            disabled={!isEditable || isBusy}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                type: e.target.value as ExtractedItemType,
              }))
            }
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {Object.values(ExtractedItemType).map((type) => (
              <option key={type} value={type} className="bg-[#111]">
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/50">
          Title
          <input
            value={draft.title}
            disabled={!isEditable || isBusy}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, title: e.target.value }))
            }
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/50">
          Description
          <textarea
            value={draft.description}
            disabled={!isEditable || isBusy}
            rows={3}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, description: e.target.value }))
            }
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50 resize-y"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-white/50">
          Priority
          <select
            value={draft.priority}
            disabled={!isEditable || isBusy}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                priority: e.target.value as ExtractedItemPriority,
              }))
            }
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {Object.values(ExtractedItemPriority).map((priority) => (
              <option key={priority} value={priority} className="bg-[#111]">
                {priority}
              </option>
            ))}
          </select>
        </label>

        {item.contextSnippet && (
          <div className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/45 italic">
            &ldquo;{item.contextSnippet}&rdquo;
          </div>
        )}
      </div>

      {isEditable && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={handleSave}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 disabled:opacity-50"
          >
            Save edits
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setPendingAction('approve')}
            className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            Approve &amp; send to Jira
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setPendingAction('reject')}
            className="rounded-lg bg-red-600/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-600/40 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {modalConfig && (
        <ConfirmationModal
          isOpen
          title={modalConfig.title}
          message={modalConfig.message}
          confirmLabel={modalConfig.confirmLabel}
          confirmingLabel={modalConfig.confirmingLabel}
          variant={modalConfig.variant}
          isConfirming={modalConfig.isConfirming}
          onConfirm={handleConfirmAction}
          onCancel={closeModal}
        />
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: ExtractedItemStatus }) {
  const styles: Record<ExtractedItemStatus, string> = {
    [ExtractedItemStatus.Draft]: 'bg-white/10 text-white/70',
    [ExtractedItemStatus.Approved]: 'bg-amber-500/20 text-amber-200',
    [ExtractedItemStatus.Rejected]: 'bg-red-500/20 text-red-200',
    [ExtractedItemStatus.Sent]: 'bg-emerald-500/20 text-emerald-200',
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}

function JiraLink({
  issueKey,
  url,
}: {
  issueKey: string;
  url: string | null;
}) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-indigo-300 hover:text-indigo-200 underline"
      >
        {issueKey}
      </a>
    );
  }

  return <span className="text-xs text-indigo-300">{issueKey}</span>;
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide">
        {title}
      </h3>
    </div>
  );
}
