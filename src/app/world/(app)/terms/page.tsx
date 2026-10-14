import type { Metadata } from 'next';
import TermsContent from '@/components/TermsContent';

export const metadata: Metadata = {
  title: 'Terms of Service — Kumami World',
  description: 'Terms of Service and conditions for using Kumami World platform.',
  robots: { index: false, follow: false },
};

export default function WorldTermsPage() {
  return (
    <div className="w-legacy-embed w-legacy-fullbleed">
      <TermsContent />
    </div>
  );
}
