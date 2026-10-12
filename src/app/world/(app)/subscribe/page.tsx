import type { Metadata } from 'next';
import { Suspense } from 'react';
import SubscribeClient from '@/components/world/billing/SubscribeClient';

export const metadata: Metadata = {
  title: 'Get Kumami Pro — Kumami World',
  description: 'Kumami Pro: Monthly $19.99 or Yearly $199.99 — pay by card or crypto.',
};

/** /world/subscribe — plan page (spec v1.13 Pro §21). Signed-out visitors are sent to sign up by WorldProtected, keeping ?ref=. */
export default function WorldSubscribePage() {
  return (
    <Suspense fallback={null}>
      <SubscribeClient />
    </Suspense>
  );
}
