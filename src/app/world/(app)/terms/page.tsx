import type { Metadata } from 'next';
import TermsContent from '@/components/legal/TermsContent';

export const metadata: Metadata = {
  title: 'Terms of Service — Kumami World',
  description: 'The rules for using Kumami World: Pro subscriptions, refunds, referrals, AI features and more.',
  robots: { index: false, follow: false },
};

export default function WorldTermsPage() {
  return <TermsContent />;
}
