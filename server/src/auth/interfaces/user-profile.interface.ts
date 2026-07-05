import { AuthProvider } from '../entities/user.entity';

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  provider: AuthProvider;
}

export function toUserProfile(user: {
  id: string;
  email: string;
  name: string;
  provider: AuthProvider;
}): UserProfileResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
  };
}
