import type { Metadata } from 'next';
import AILabsContent from '@/components/AILabsContent';

export const metadata: Metadata = {
  title: 'AI Labs — Kumami World',
  description: 'Experimental AI tools for Web3 research.',
};

export default function AILabsPage() {
  return (
    <div className="w-legacy-embed">
      <AILabsContent />
    </div>
  );
}
