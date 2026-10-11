import type { Metadata } from 'next';
import { Suspense } from 'react';
import SubscribeSuccess from '@/components/world/billing/SubscribeSuccess';

export const metadata: Metadata = {
  title: 'Payment received — Kumami World',
  robots: { index: false, follow: false },
};

export default function WorldSubscribeSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SubscribeSuccess />
    </Suspense>
  );
}
