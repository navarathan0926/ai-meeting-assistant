'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import {
  usePlatformSettings,
  useUpdatePlatformSettings,
} from '@/hooks/usePlatformSettings';
import { getUserFacingErrorMessage } from '@/lib/api/auth-errors';
import { getDefaultAppPath } from '@/lib/auth-routes';

export default function PlatformSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthContext();
  const { data: settings, isLoading, isError, error } = usePlatformSettings();
  const updateMutation = useUpdatePlatformSettings();

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      router.replace(getDefaultAppPath(user.role));
    }
  }, [user, router]);

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-white flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/8 px-6 py-4 flex items-center gap-3 bg-[#09090f]/95 backdrop-blur">
        <Link href="/superadmin" className="flex items-center gap-3 hover:opacity-90">
          <span className="text-2xl">🎙️</span>
          <h1 className="font-bold text-lg tracking-tight">Platform Settings</h1>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/superadmin"
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            Organizations
          </Link>
          <span className="text-xs text-white/50 font-mono hidden sm:inline">
            {user.name}
            <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-200">
              SUPERADMIN
            </span>
          </span>
          <button
            onClick={() => void logout()}
            className="text-xs bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded border border-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-semibold text-white/90">Platform settings</h2>
            <p className="mt-1 text-sm text-white/45">
              Control platform-wide access policies for all organizations.
            </p>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-white/90 text-sm uppercase tracking-wide mb-4">
              Public signup
            </h3>

            {isLoading ? (
              <p className="text-sm text-white/50">Loading platform settings…</p>
            ) : null}

            {isError ? (
              <p className="text-sm text-red-200">
                {getUserFacingErrorMessage(error, 'Could not load platform settings. Please try again.')}
              </p>
            ) : null}

            {settings ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-white/55">
                  When disabled, new users cannot register with email/password or
                  create accounts via Google. Existing users can still sign in.
                  Organization admins provision users from the Users page.
                </p>
                <label className="flex items-center gap-3 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={settings.allowPublicSignup}
                    disabled={updateMutation.isPending}
                    onChange={(e) =>
                      updateMutation.mutate(e.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/5"
                  />
                  Allow public signup
                </label>
                <p className="text-xs text-white/35">
                  Last updated: {new Date(settings.updatedAt).toLocaleString()}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
