import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Staking Hub — Kumami World',
  description: 'Maximize your crypto earnings with Kumami Staking. Secure token staking, real-time monitoring, and automated portfolio analysis coming soon.',
  alternates: { canonical: 'https://kumami.world/staking' },
  openGraph: {
    title: 'Staking Hub — Kumami World',
    description: 'Maximize your crypto earnings with Kumami Staking. Secure token staking, real-time monitoring, and automated portfolio analysis coming soon.',
    url: 'https://kumami.world/staking',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Staking Hub — Kumami World' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Staking Hub — Kumami World',
    description: 'Maximize your crypto earnings with Kumami Staking. Secure token staking, real-time monitoring, and automated portfolio analysis coming soon.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function StakingPage() {
  return (
    <>
      <ComingSoon pageName="Staking" />
      <Footer />
    </>
  )
}
