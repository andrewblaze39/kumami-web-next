import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fear & Greed — Kumami World',
  description: 'How fearful or greedy the crypto market is right now, and how it has moved.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
