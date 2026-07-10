import type { Metadata } from 'next';
import AllGamesGrid from '@/components/AllGamesGrid';

export const metadata: Metadata = {
  title: 'All Games — Kumami World',
  description: 'Browse every game available on Kumami World Game Zone.',
};

export default function WorldAllGamesPage() {
  return (
    <div className="w-legacy-embed w-legacy-fullbleed">
      <AllGamesGrid />
    </div>
  );
}
