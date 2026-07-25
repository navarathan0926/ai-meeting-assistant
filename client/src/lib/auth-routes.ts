import { UserRole } from '@/types/auth';

export type AppRoutePath =
  | '/dashboard'
  | '/settings'
  | '/settings/users'
  | '/superadmin'
  | '/superadmin/platform-settings';

export const APP_ROUTE_ACCESS: Record<AppRoutePath, UserRole[]> = {
  '/dashboard': [UserRole.User, UserRole.Admin],
  '/settings': [UserRole.Admin],
  '/settings/users': [UserRole.Admin],
  '/superadmin': [UserRole.SuperAdmin],
  '/superadmin/platform-settings': [UserRole.SuperAdmin],
};

export interface AppNavItem {
  href: AppRoutePath;
  label: string;
}

const APP_NAV_ITEMS: AppNavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings', label: 'Settings' },
  { href: '/settings/users', label: 'Users' },
];

function resolveAppRoute(pathname: string): AppRoutePath | null {
  const routes = Object.keys(APP_ROUTE_ACCESS) as AppRoutePath[];
  const match = routes
    .filter((route) => pathname === route || pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  return match ?? null;
}

export function getDefaultAppPath(role: UserRole | undefined): string {
  if (role === UserRole.SuperAdmin) {
    return '/superadmin';
  }
  return '/dashboard';
}

export function canAccessRoute(
  role: UserRole | undefined,
  pathname: string,
): boolean {
  if (!role) {
    return false;
  }

  const route = resolveAppRoute(pathname);
  if (!route) {
    return false;
  }

  const allowedRoles = APP_ROUTE_ACCESS[route];
  return allowedRoles.includes(role);
}

export function getRedirectForUnauthorized(
  role: UserRole | undefined,
): string {
  return getDefaultAppPath(role);
}

export function getNavItemsForRole(role: UserRole | undefined): AppNavItem[] {
  if (!role) {
    return [];
  }

  return APP_NAV_ITEMS.filter((item) =>
    APP_ROUTE_ACCESS[item.href].includes(role),
  );
}
