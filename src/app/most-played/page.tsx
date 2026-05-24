import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import MostPlayedGrid from '@/components/MostPlayedGrid'

export const metadata: Metadata = {
  title: 'Most Played Games — Kumami World',
  description: 'Discover the most played games on Kumami World Game Zone.',
  alternates: { canonical: 'https://kumami.world/most-played' },
  openGraph: {
    title: 'Most Played Games — Kumami World',
    description: 'Discover the most played games on Kumami World Game Zone.',
    url: 'https://kumami.world/most-played',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Most Played Games — Kumami World' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Most Played Games — Kumami World',
    description: 'Discover the most played games on Kumami World Game Zone.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function MostPlayedPage() {
  return (
    <>
      <MostPlayedGrid />
      <Footer />
    </>
  )
}
