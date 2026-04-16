import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Staking Hub — Kumami World',
  description: 'Maximize your crypto earnings with Kumami Staking. Secure token staking, real-time monitoring, and automated portfolio analysis coming soon.',
  openGraph: {
    title: 'Staking Hub — Kumami World',
    description: 'Maximize your crypto earnings with Kumami Staking. Secure token staking, real-time monitoring, and automated portfolio analysis coming soon.',
    url: 'https://kumami.world/staking',
    images: ['https://kumami.world/og-default.png'],
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
