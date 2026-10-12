import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watchlist — Kumami World',
  description: 'The major market anchors and the coins you follow, with live signals.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
