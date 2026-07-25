'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import {
  canAccessRoute,
  getRedirectForUnauthorized,
} from '@/lib/auth-routes';

export function RoleGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuthContext();

  const allowed = canAccessRoute(user?.role, pathname);

  useEffect(() => {
    if (!isLoading && user && !allowed) {
      router.replace(getRedirectForUnauthorized(user.role));
    }
  }, [allowed, isLoading, router, user]);

  if (isLoading || !user || !allowed) {
    return null;
  }

  return <>{children}</>;
}
