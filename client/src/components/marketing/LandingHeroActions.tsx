'use client';

import Link from 'next/link';
import { MarketingRegisterLink } from '@/components/marketing/MarketingAuthActions';

export function LandingHeroActions() {
  return (
    <div className="flex flex-wrap gap-4">
      <MarketingRegisterLink className="bg-[#39FF14] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#32e612] transition-colors">
        Start free
      </MarketingRegisterLink>
      <Link
        href="/features"
        className="border border-white/15 text-white px-6 py-3 rounded-lg hover:bg-white/5 transition-colors"
      >
        See features
      </Link>
    </div>
  );
}
