'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { getNavItemsForRole } from '@/lib/auth-routes';

export function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();
  const navItems = getNavItemsForRole(user?.role);

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 px-6 py-4 flex items-center gap-3 bg-[#09090f]/95 backdrop-blur">
      <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90">
        <span className="text-2xl">🎙️</span>
        <h1 className="font-bold text-lg tracking-tight">AI Meeting Assistant</h1>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs transition-colors ${
                isActive
                  ? 'text-white font-medium'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <span className="text-xs text-white/50 font-mono hidden sm:inline">
          Signed in as <span className="text-[#39FF14]">{user?.name}</span>
          {user?.role ? (
            <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-white/10 text-white/60">
              {user.role}
            </span>
          ) : null}
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
