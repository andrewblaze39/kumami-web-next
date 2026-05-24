import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Crypto Market — Kumami World',
  description: 'Live crypto market data and analysis from Kumami World.',
  openGraph: {
    title: 'Crypto Market — Kumami World',
    description: 'Live crypto market data and analysis from Kumami World.',
    url: 'https://kumami.world/market',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Crypto Market — Kumami World' }],
  },
  alternates: {
    canonical: 'https://kumami.world/market',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crypto Market — Kumami World',
    description: 'Live crypto market data and analysis from Kumami World.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function MarketPage() {
  return (
    <>
      <ComingSoon pageName="Market" />
      <Footer />
    </>
  )
}
