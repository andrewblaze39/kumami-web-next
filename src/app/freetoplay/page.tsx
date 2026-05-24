import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import FreeToPlayGrid from '@/components/FreeToPlayGrid'

export const metadata: Metadata = {
  title: 'Free to Play Games — Kumami World',
  description:
    'Discover the best free to play games on Kumami World Game Zone.',
  alternates: { canonical: 'https://kumami.world/freetoplay' },
  openGraph: {
    title: 'Free to Play Games — Kumami World',
    description:
      'Discover the best free to play games on Kumami World Game Zone.',
    url: 'https://kumami.world/freetoplay',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Free to Play Games — Kumami World' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free to Play Games — Kumami World',
    description:
      'Discover the best free to play games on Kumami World Game Zone.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function FreeToPlayPage() {
  return (
    <>
      <FreeToPlayGrid />
      <Footer />
    </>
  )
}
