import { ExtractedItemType } from '../enums/extracted-item-type.enum';
import { ExtractedItemPriority } from '../enums/extracted-item-priority.enum';
import { ExtractedItemStatus } from '../enums/extracted-item-status.enum';
import { JiraAdfDocument } from '../../common/jira-document/jira-document.types';

export interface ExtractedItemResponse {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ApproveExtractedItemResponse extends ExtractedItemResponse {
  jiraError?: string;
}
