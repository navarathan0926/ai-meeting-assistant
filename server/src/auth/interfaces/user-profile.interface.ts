import { AuthProvider } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  provider: AuthProvider;
  role: UserRole;
}

export function toUserProfile(user: {
  id: string;
  email: string;
  name: string;
  provider: AuthProvider;
  role: UserRole;
}): UserProfileResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    role: user.role,
  };
}
