import {
  emptyJiraAdfDocument,
  isJiraAdfDocument,
  JiraAdfDocument,
} from '@/lib/jira-document/types';

export type { JiraAdfDocument };

// ── Enums ────────────────────────────────────────────────────────────────────

export enum ExtractedItemType {
  Bug = 'bug',
  Task = 'task',
  Story = 'story',
  Feature = 'feature',
}

export enum ExtractedItemPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum ExtractedItemStatus {
  Draft = 'draft',
  Approved = 'approved',
  Rejected = 'rejected',
  Sent = 'sent',
}

// ── Extracted item ────────────────────────────────────────────────────────────

export interface ExtractedItem {
  id: string;
  meetingId: string;
  type: ExtractedItemType;
  title: string;
  description: JiraAdfDocument;
  priority: ExtractedItemPriority;
  contextSnippet: string | null;
  status: ExtractedItemStatus;
  jiraIssueKey: string | null;
  jiraIssueUrl: string | null;
  jiraSyncError?: string | null;
  suggestedProjectKey: string | null;
  projectConfidence: number | null;
  extractionConfidence: number | null;
  finalProjectKey: string | null;
  needsProjectReview: boolean;
  lowExtractionConfidence: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveExtractedItemResult extends ExtractedItem {
  jiraError?: string;
}

export interface UpdateExtractedItemPayload {
  type?: ExtractedItemType;
  title?: string;
  description?: JiraAdfDocument;
  priority?: ExtractedItemPriority;
  finalProjectKey?: string;
}

export function normalizeExtractedItemDescription(
  description: unknown,
): JiraAdfDocument {
  if (isJiraAdfDocument(description)) {
    return description;
  }
  if (typeof description === 'string' && description.trim()) {
    return {
      type: 'doc',
      version: 1,
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: description }] },
      ],
    };
  }
  return emptyJiraAdfDocument();
}
