import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Intelligence — Kumami World',
  description: 'Your daily market briefing: overall mood, the major assets and anything urgent, in one glance.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
