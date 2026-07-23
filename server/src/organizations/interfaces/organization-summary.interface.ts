import { OrganizationStatus } from '../enums/organization-status.enum';

export interface OrganizationFirstAdmin {
  name: string;
  email: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  isActive: boolean;
  status: OrganizationStatus;
  createdAt: Date;
  meetingCount: number;
  extractedItemCount: number;
  firstAdmin: OrganizationFirstAdmin | null;
}
