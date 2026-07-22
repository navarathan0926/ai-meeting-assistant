import { UserRole } from '@/types/auth';

export function getDefaultAppPath(role: UserRole | undefined): string {
  if (role === 'SUPERADMIN') {
    return '/superadmin';
  }
  return '/dashboard';
}
