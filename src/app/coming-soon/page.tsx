import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoonGames from '@/components/ComingSoonGames'

export const metadata: Metadata = {
  title: 'Coming Soon Games — Kumami World',
  description: 'Discover upcoming games coming to Kumami World Game Zone.',
  openGraph: {
    title: 'Coming Soon Games — Kumami World',
    description: 'Discover upcoming games coming to Kumami World Game Zone.',
    url: 'https://kumami.world/coming-soon',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coming Soon Games — Kumami World',
    description: 'Discover upcoming games coming to Kumami World Game Zone.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function ComingSoonPage() {
  return (
    <>
      <ComingSoonGames />
      <Footer />
    </>
  )
}
