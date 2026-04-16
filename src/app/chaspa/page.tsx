import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Chaspa — Kumami World',
  description: 'Discover Chaspa, a Kumami World gaming community initiative.',
  openGraph: {
    title: 'Chaspa — Kumami World',
    description: 'Discover Chaspa, a Kumami World gaming community initiative.',
    url: 'https://kumami.world/chaspa',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chaspa — Kumami World',
    description: 'Discover Chaspa, a Kumami World gaming community initiative.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function ChaspaPage() {
  return (
    <>
      <ComingSoon pageName="Chaspa" />
      <Footer />
    </>
  )
}
