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
  description: string;
  priority: ExtractedItemPriority;
  contextSnippet: string | null;
  status: ExtractedItemStatus;
  jiraIssueKey: string | null;
  jiraIssueUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveExtractedItemResult extends ExtractedItem {
  jiraError?: string;
}

export interface UpdateExtractedItemPayload {
  type?: ExtractedItemType;
  title?: string;
  description?: string;
  priority?: ExtractedItemPriority;
}
