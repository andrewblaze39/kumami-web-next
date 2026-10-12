import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flow Radar — Kumami World',
  description: 'Whale, fund and smart-money flows across the major coins.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
