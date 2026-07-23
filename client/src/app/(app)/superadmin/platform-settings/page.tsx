'use client';

import {
  usePlatformSettings,
  useUpdatePlatformSettings,
} from '@/hooks/usePlatformSettings';
import { getUserFacingErrorMessage } from '@/lib/api/auth-errors';

export default function PlatformSettingsPage() {
  const { data: settings, isLoading, isError, error } = usePlatformSettings();
  const updateMutation = useUpdatePlatformSettings();

  return (
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
  );
}
