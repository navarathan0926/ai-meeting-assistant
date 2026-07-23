'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { UserRole } from '@/types/auth';

export function PlatformAdminHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();

  const isOrganizations = pathname === '/superadmin';
  const isPlatformSettings = pathname.startsWith('/superadmin/platform-settings');

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 px-6 py-4 flex items-center gap-3 bg-[#09090f]/95 backdrop-blur">
      <Link href="/superadmin" className="flex items-center gap-3 hover:opacity-90">
        <span className="text-2xl">🎙️</span>
        <h1 className="font-bold text-lg tracking-tight">
          {isPlatformSettings ? 'Platform Settings' : 'Platform Admin'}
        </h1>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <Link
          href="/superadmin"
          className={`text-xs transition-colors ${
            isOrganizations
              ? 'text-white font-medium'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Organizations
        </Link>
        <Link
          href="/superadmin/platform-settings"
          className={`text-xs transition-colors ${
            isPlatformSettings
              ? 'text-white font-medium'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Platform settings
        </Link>
        <span className="text-xs text-white/50 font-mono hidden sm:inline">
          {user?.name}
          <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-200">
            {UserRole.SuperAdmin}
          </span>
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-xs bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded border border-white/10 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
