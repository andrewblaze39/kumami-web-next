import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Course — Kumami Academy',
  description: 'A Kumami Academy course: learn crypto and Web3 step by step.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
