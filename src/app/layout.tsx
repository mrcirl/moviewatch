import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MovieWatch',
  description: 'Your watchlist, who to watch it with, and where to find it.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
