import type { Metadata } from 'next';
import { Audiowide } from 'next/font/google';
import './globals.css';

const displayFont = Audiowide({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'MovieWatch',
  description: 'Your watchlist, who to watch it with, and where to find it.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={displayFont.variable}>
      <body>{children}</body>
    </html>
  );
}
