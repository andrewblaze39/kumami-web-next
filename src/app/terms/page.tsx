import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import TermsContent from '@/components/TermsContent';

export const metadata: Metadata = {
  title: 'Terms of Service — Kumami World',
  description: 'Terms of Service and conditions for using Kumami World platform.',
  openGraph: {
    title: 'Terms of Service — Kumami World',
    description: 'Terms of Service and conditions for using Kumami World platform.',
    url: 'https://kumami.world/terms',
  },
  alternates: { canonical: 'https://kumami.world/terms' },
  robots: { index: false, follow: true },
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
