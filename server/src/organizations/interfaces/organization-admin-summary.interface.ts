import { UserRole } from '../../auth/enums/user-role.enum';

export interface OrganizationAdminSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole.Admin;
  provider: 'local' | 'google';
  isActive: boolean;
  createdAt: Date;
}
