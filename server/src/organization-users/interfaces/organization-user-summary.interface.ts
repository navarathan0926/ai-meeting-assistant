import { UserRole } from '../../auth/enums/user-role.enum';
import { AuthProvider } from '../../auth/entities/user.entity';

export interface OrganizationUserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  provider: AuthProvider;
  isActive: boolean;
  createdAt: Date;
}
