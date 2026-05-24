import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import MostPopularGrid from '@/components/MostPopularGrid'

export const metadata: Metadata = {
  title: 'Most Popular Games — Kumami World',
  description: 'Explore the most popular games on Kumami World Game Zone.',
  alternates: { canonical: 'https://kumami.world/most-popular' },
  openGraph: {
    title: 'Most Popular Games — Kumami World',
    description: 'Explore the most popular games on Kumami World Game Zone.',
    url: 'https://kumami.world/most-popular',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Most Popular Games — Kumami World' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Most Popular Games — Kumami World',
    description: 'Explore the most popular games on Kumami World Game Zone.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function MostPopularPage() {
  return (
    <>
      <MostPopularGrid />
      <Footer />
    </>
  )
}
