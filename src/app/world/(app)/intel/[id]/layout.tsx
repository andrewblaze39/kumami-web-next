import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Intelligence — Kumami World',
  description: 'A market intelligence brief from Kumami World.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
