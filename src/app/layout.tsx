import type { Metadata } from 'next';
import { Audiowide } from 'next/font/google';
import { THEME_BOOTSTRAP_SCRIPT } from '@/lib/theme';
import './globals.css';

const displayFont = Audiowide({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'MovieWatch',
  description: 'Your watchlist, who to watch it with, and where to find it.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={displayFont.variable}>
      <head>
        {/* Applies the saved style/mode before first paint, so there's no flash of the default theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
