import type { Metadata } from 'next';
import GamesPortal from '@/components/GamesPortal';

export const metadata: Metadata = {
  title: 'Games — Kumami World',
  description: 'Learn through interactive crypto games.',
};

export default function GamesPage() {
  return (
    <div className="w-legacy-embed">
      <GamesPortal />
    </div>
  );
}
