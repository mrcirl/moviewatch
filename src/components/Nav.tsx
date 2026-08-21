'use client';

import { useEffect, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-base-800 bg-base-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="MovieWatch home">
          <Logo size={26} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(link.href) ? 'bg-base-800 text-base-200' : 'text-base-400 hover:bg-base-800 hover:text-base-200'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="btn-ghost hidden text-sm md:inline-flex">
          Sign out
        </button>

        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-base-300 hover:bg-base-800 md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-base-800 px-2 pb-3 pt-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(link.href) ? 'bg-base-800 text-base-200' : 'text-base-400 hover:bg-base-800 hover:text-base-200'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-base-400 hover:bg-base-800 hover:text-base-200"
          >
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
