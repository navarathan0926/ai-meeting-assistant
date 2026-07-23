'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ExtractedItem,
  ExtractedItemPriority,
  ExtractedItemStatus,
  ExtractedItemType,
  normalizeExtractedItemDescription,
  UpdateExtractedItemPayload,
} from '@/types/extracted-item';
import { ExtractionAnalysis, MeetingStatus } from '@/types/meeting';
import {
  useApproveExtractedItem,
  useExtractedItems,
  useRejectExtractedItem,
  useUpdateExtractedItem,
} from '@/hooks/useExtractedItems';
import { useJiraProjects } from '@/hooks/useJiraProjects';
import { useAuthContext } from '@/providers/AuthProvider';
import { UserRole } from '@/types/auth';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { ProjectSelector } from '@/components/extracted-items/ProjectSelector';
import { JiraDocumentRenderer } from '@/lib/jira-document/JiraDocumentRenderer';
import { JiraAdfDocument } from '@/lib/jira-document/types';

const RichDescriptionEditor = dynamic(
  () =>
    import('@/lib/jira-document/RichDescriptionEditor').then(
      (mod) => mod.RichDescriptionEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-white/50 py-4">Loading editor…</p>
    ),
  },
);

interface ExtractedItemsReviewProps {
  meetingId: string;
  meetingStatus?: MeetingStatus;
  extractionAnalysis?: ExtractionAnalysis | null;
}

type PendingAction = 'approve' | 'reject';

export function ExtractedItemsReview({
  meetingId,
  meetingStatus,
  extractionAnalysis,
}: ExtractedItemsReviewProps) {
  const { user } = useAuthContext();
  const canApprove = user?.role === UserRole.Admin;
  const { data: items, isLoading, isFetching } = useExtractedItems(meetingId);
  const { data: projects = [] } = useJiraProjects();

  if (isLoading || (isFetching && !items)) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <SectionTitle icon="🎯" title="Extracted Items" />
        <p className="mt-3 text-sm text-white/50">Loading extracted items…</p>
      </section>
    );
  }

  const hasItems = Boolean(items && items.length > 0);
  const analysisComplete = Boolean(extractionAnalysis);
  const stillProcessing =
    !hasItems &&
    !analysisComplete &&
    meetingStatus === MeetingStatus.Completed;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <SectionTitle icon="🎯" title="Extracted Items" />
      <p className="mt-2 text-xs text-white/40">
        {canApprove
          ? 'Review, edit, and approve items before sending them to Jira.'
          : 'Review and edit draft items. An admin must approve before items are sent to Jira.'}
      </p>

      <MeetingAnalysisBanner analysis={extractionAnalysis ?? null} />

      {!hasItems ? (
        <EmptyExtractionState
          stillProcessing={stillProcessing}
          analysis={extractionAnalysis ?? null}
        />
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {items!.map((item) => (
            <ExtractedItemCard
              key={item.id}
              item={item}
              meetingId={meetingId}
              projects={projects}
              canApprove={canApprove}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MeetingAnalysisBanner({
  analysis,
}: {
  analysis: ExtractionAnalysis | null;
}) {
  if (!analysis) {
    return null;
  }

  if (analysis.showNoWorkBanner) {
    return (
      <div className="mt-4 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70">
        No project-relevant work was found in this meeting.
        <p className="mt-1 text-xs text-white/45">{analysis.summary}</p>
      </div>
    );
  }

  if (analysis.showLowRelevanceWarning) {
    return (
      <div className="mt-4 rounded-lg border border-amber-400/40 bg-amber-900/20 px-3 py-2 text-sm text-amber-100">
        Extraction confidence is low; review carefully or re-run.
        <p className="mt-1 text-xs text-amber-100/70">{analysis.summary}</p>
      </div>
    );
  }

  return null;
}

function EmptyExtractionState({
  stillProcessing,
  analysis,
}: {
  stillProcessing: boolean;
  analysis: ExtractionAnalysis | null;
}) {
  if (stillProcessing) {
    return (
      <p className="mt-3 text-sm text-white/50">
        Extraction is still processing. Items will appear here when ready.
      </p>
    );
  }

  if (analysis && analysis.hasActionableWork === false) {
    return (
      <p className="mt-3 text-sm text-white/50">
        Extraction complete — no actionable Jira items were found.
      </p>
    );
  }

  return (
    <p className="mt-3 text-sm text-white/50">
      No actionable items were extracted from this meeting.
    </p>
  );
}

function ExtractedItemCard({
  item,
  meetingId,
  projects,
  canApprove,
}: {
  item: ExtractedItem;
  meetingId: string;
  projects: ReturnType<typeof useJiraProjects>['data'];
  canApprove: boolean;
}) {
  const updateMutation = useUpdateExtractedItem(meetingId);
  const rejectMutation = useRejectExtractedItem(meetingId);
  const approveMutation = useApproveExtractedItem(meetingId);

  const [draft, setDraft] = useState({
    type: item.type,
    title: item.title,
    description: normalizeExtractedItemDescription(item.description),
    priority: item.priority,
    projectKey: item.finalProjectKey ?? item.suggestedProjectKey ?? '',
  });
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    setDraft({
      type: item.type,
      title: item.title,
      description: normalizeExtractedItemDescription(item.description),
      priority: item.priority,
      projectKey: item.finalProjectKey ?? item.suggestedProjectKey ?? '',
    });
    setIsEditingDescription(false);
  }, [
    item.id,
    item.updatedAt,
    item.type,
    item.title,
    item.priority,
    item.finalProjectKey,
    item.suggestedProjectKey,
  ]);

  const isEditable = item.status === ExtractedItemStatus.Draft;
  const isBusy =
    updateMutation.isPending ||
    rejectMutation.isPending ||
    approveMutation.isPending;
  const projectList = projects ?? [];

  const handleSave = () => {
    const payload: UpdateExtractedItemPayload = {};
    if (draft.type !== item.type) payload.type = draft.type;
    if (draft.title !== item.title) payload.title = draft.title;
    if (draft.priority !== item.priority) payload.priority = draft.priority;

    const currentProject = item.finalProjectKey ?? item.suggestedProjectKey ?? '';
    if (draft.projectKey && draft.projectKey !== currentProject) {
      payload.finalProjectKey = draft.projectKey;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    updateMutation.mutate({ id: item.id, payload });
  };

  const handleProjectChange = (projectKey: string) => {
    setDraft((prev) => ({ ...prev, projectKey }));
    if (!isEditable || !projectKey) {
      return;
    }
    const currentProject = item.finalProjectKey ?? item.suggestedProjectKey ?? '';
    if (projectKey === currentProject || projectKey === item.finalProjectKey) {
      return;
    }
    updateMutation.mutate({
      id: item.id,
      payload: { finalProjectKey: projectKey },
    });
  };

  const handleDescriptionSave = (description: JiraAdfDocument) => {
    updateMutation.mutate(
      { id: item.id, payload: { description } },
      {
        onSuccess: (updatedItem) => {
          const normalized = normalizeExtractedItemDescription(
            updatedItem.description,
          );
          setDraft((prev) => ({ ...prev, description: normalized }));
          setIsEditingDescription(false);
        },
      },
    );
  };

  const handleDescriptionCancel = () => {
    setDraft((prev) => ({
      ...prev,
      description: normalizeExtractedItemDescription(item.description),
    }));
    setIsEditingDescription(false);
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
              Approve &ldquo;{item.title}&rdquo; and create a Jira issue
              {draft.projectKey ? ` in ${draft.projectKey}` : ''} with the
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
            title: 'Dismiss item',
            message: (
              <>
                Dismiss &ldquo;{item.title}&rdquo;? It will not be sent to Jira and
                cannot be approved later.
              </>
            ),
            confirmLabel: 'Dismiss',
            confirmingLabel: 'Dismissing…',
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
        <ConfidenceBadge
          label="Project match"
          value={item.projectConfidence}
          warn={item.needsProjectReview}
        />
        <ConfidenceBadge
          label="Extraction confidence"
          value={item.extractionConfidence}
          warn={item.lowExtractionConfidence}
        />
        {item.needsProjectReview && isEditable && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
            Select project
          </span>
        )}
        {item.lowExtractionConfidence && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
            Review carefully
          </span>
        )}
      </div>

      {item.jiraSyncError && item.status === ExtractedItemStatus.Draft && (
        <p className="mb-3 text-xs text-red-400/90 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2">
          Last Jira sync failed: {item.jiraSyncError}
        </p>
      )}

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

        <ProjectSelector
          projects={projectList}
          value={draft.projectKey}
          disabled={!isEditable || isBusy}
          needsAttention={item.needsProjectReview && isEditable}
          onChange={handleProjectChange}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Description</span>
            {isEditable && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  if (isEditingDescription) {
                    handleDescriptionCancel();
                    return;
                  }
                  setIsEditingDescription(true);
                }}
                className="text-xs text-indigo-300 hover:text-indigo-200 disabled:opacity-50"
              >
                {isEditingDescription ? 'Preview' : 'Edit'}
              </button>
            )}
          </div>

          {isEditable && isEditingDescription ? (
            <RichDescriptionEditor
              document={draft.description}
              disabled={isBusy}
              onSave={handleDescriptionSave}
              onCancel={handleDescriptionCancel}
            />
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3">
              <JiraDocumentRenderer document={draft.description} />
            </div>
          )}
        </div>

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
          {canApprove && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setPendingAction('approve')}
              className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              Approve &amp; send to Jira
            </button>
          )}
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setPendingAction('reject')}
            className="rounded-lg bg-red-600/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-600/40 disabled:opacity-50"
          >
            Dismiss
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

function ConfidenceBadge({
  label,
  value,
  warn,
}: {
  label: string;
  value: number | null;
  warn: boolean;
}) {
  if (value === null || value === undefined) {
    return null;
  }
  const pct = Math.round(value * 100);
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${
        warn
          ? 'bg-amber-500/20 text-amber-200'
          : 'bg-emerald-500/20 text-emerald-200'
      }`}
    >
      {label} {pct}%
    </span>
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
