import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Pulse — Kumami World',
  description: 'What is happening beneath the price: funding, liquidations, open interest and exchange flows.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
