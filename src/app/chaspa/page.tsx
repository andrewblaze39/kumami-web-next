import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Chaspa — Kumami World',
  description: 'Discover Chaspa, a Kumami World gaming community initiative.',
  alternates: { canonical: 'https://kumami.world/chaspa' },
  openGraph: {
    title: 'Chaspa — Kumami World',
    description: 'Discover Chaspa, a Kumami World gaming community initiative.',
    url: 'https://kumami.world/chaspa',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Chaspa — Kumami World' }],
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
