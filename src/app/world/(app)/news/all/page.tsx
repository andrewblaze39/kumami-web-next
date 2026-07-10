import type { Metadata } from 'next';
import AllNewsGrid from '@/components/AllNewsGrid';

export const metadata: Metadata = {
  title: 'All News — Kumami World',
  description: 'Browse all crypto and Web3 news articles on Kumami World.',
  openGraph: {
    title: 'All News — Kumami World',
    description: 'Browse all crypto and Web3 news articles on Kumami World.',
    url: 'https://kumami.world/world/news/all',
  },
};

export default function WorldAllNewsPage() {
  return (
    <div className="w-legacy-embed w-legacy-fullbleed">
      <AllNewsGrid />
    </div>
  );
}
