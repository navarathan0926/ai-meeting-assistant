'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { fetchAuthConfig } from '@/lib/api/auth';

function usePublicSignupAllowed(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAuthConfig()
      .then((config) => {
        if (!cancelled) {
          setAllowed(config.allowPublicSignup);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllowed(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return allowed;
}

export function MarketingRegisterLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const allowed = usePublicSignupAllowed();

  if (allowed === false) {
    return null;
  }

  return (
    <Link href="/register" className={className}>
      {children}
    </Link>
  );
}

export function MarketingAuthActions() {
  const allowed = usePublicSignupAllowed();

  return (
    <div className="ml-auto flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm text-white/70 hover:text-white px-3 py-1.5 transition-colors"
      >
        Sign in
      </Link>
      {allowed ? (
        <Link
          href="/register"
          className="text-sm bg-[#39FF14] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#32e612] transition-colors"
        >
          Get started
        </Link>
      ) : null}
    </div>
  );
}
