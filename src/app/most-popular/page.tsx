import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import MostPopularGrid from '@/components/MostPopularGrid'

export const metadata: Metadata = {
  title: 'Most Popular Games — Kumami World',
  description: 'Explore the most popular games on Kumami World Game Zone.',
  openGraph: {
    title: 'Most Popular Games — Kumami World',
    description: 'Explore the most popular games on Kumami World Game Zone.',
    url: 'https://kumami.world/most-popular',
    images: ['https://kumami.world/og-default.png'],
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
