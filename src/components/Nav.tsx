'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from './Logo';

const links = [
  { href: '/', label: 'Watchlist' },
  { href: '/search', label: 'Search' },
  { href: '/recommended', label: 'Recommended' },
  { href: '/browse', label: 'Browse available' },
  { href: '/people', label: 'People' },
  { href: '/places', label: 'Places' },
  { href: '/settings', label: 'Settings' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-base-800 bg-base-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="MovieWatch home">
            <Logo size={26} />
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'bg-base-800 text-base-200' : 'text-base-400 hover:bg-base-800 hover:text-base-200'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button onClick={logout} className="btn-ghost text-sm">
          Sign out
        </button>
      </div>
    </header>
  );
}
