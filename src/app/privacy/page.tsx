import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import PrivacyContent from '@/components/legal/PrivacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy — Kumami World',
  description: 'What personal data Kumami World collects, why, who it is shared with, and your rights.',
  openGraph: {
    title: 'Privacy Policy — Kumami World',
    description: 'What personal data Kumami World collects, why, who it is shared with, and your rights.',
    url: 'https://kumami.world/privacy',
  },
  alternates: { canonical: 'https://kumami.world/privacy' },
};

/** Public Privacy Policy — readable without an account (/world/privacy has the same content for members). */
export default function PrivacyPage() {
  return (
    <>
      <PrivacyContent />
      <Footer />
    </>
  );
}
