import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calendar — Kumami World',
  description: 'Key crypto dates and events picked by the Kumami team: macro releases, token unlocks and project milestones.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
