import type { Metadata } from 'next';
import GameDetailView from '@/components/GameDetailView';

export const metadata: Metadata = {
  title: 'Game Details — Kumami World',
  description: 'Discover games on Kumami World Game Zone.',
};

interface PageProps {
  searchParams: Promise<{ name?: string }>;
}

export default async function WorldGameDetailsPage({ searchParams }: PageProps) {
  const { name } = await searchParams;
  return (
    <div className="w-legacy-embed w-legacy-fullbleed">
      <GameDetailView gameName={name} />
    </div>
  );
}
