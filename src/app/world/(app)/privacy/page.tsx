import type { Metadata } from 'next';
import PrivacyContent from '@/components/legal/PrivacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy — Kumami World',
  description: 'What personal data Kumami World collects, why, who it is shared with, and your rights.',
  robots: { index: false, follow: false },
};

export default function WorldPrivacyPage() {
  return <PrivacyContent />;
}
