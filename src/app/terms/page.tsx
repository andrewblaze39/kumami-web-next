import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import TermsContent from '@/components/legal/TermsContent';

export const metadata: Metadata = {
  title: 'Terms of Service — Kumami World',
  description: 'The rules for using Kumami World: Pro subscriptions, refunds, referrals, AI features and more.',
  openGraph: {
    title: 'Terms of Service — Kumami World',
    description: 'The rules for using Kumami World: Pro subscriptions, refunds, referrals, AI features and more.',
    url: 'https://kumami.world/terms',
  },
  alternates: { canonical: 'https://kumami.world/terms' },
};

/**
 * Public Terms of Service. Legal pages must be readable without an account, so
 * this no longer redirects into the signed-in shell (/world/terms stays for
 * members, with the same content).
 */
export default function TermsPage() {
  return (
    <>
      <TermsContent />
      <Footer />
    </>
  );
}
