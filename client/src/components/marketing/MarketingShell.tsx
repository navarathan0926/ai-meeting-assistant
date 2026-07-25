import Link from 'next/link';
import { MarketingAuthActions } from '@/components/marketing/MarketingAuthActions';

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/security', label: 'Security' },
  { href: '/support', label: 'Support' },
];

export function MarketingNav() {
  return (
    <header className="border-b border-white/8 bg-[#09090f]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="text-2xl">🎙️</span>
          <span>AI Meeting Assistant</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <MarketingAuthActions />
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/8 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
        <p className="text-sm text-white/40">
          © {new Date().getFullYear()} AI Meeting Assistant. All rights reserved.
        </p>
        <div className="flex flex-wrap gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
