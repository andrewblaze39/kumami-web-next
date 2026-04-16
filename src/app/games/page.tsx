import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import GamesPortal from '@/components/GamesPortal'

export const metadata: Metadata = {
  title: 'Web3 Games — Kumami World',
  description:
    'Explore the best Web3 and crypto games curated by Kumami World.',
  openGraph: {
    title: 'Web3 Games — Kumami World',
    description:
      'Explore the best Web3 and crypto games curated by Kumami World.',
    url: 'https://kumami.world/games',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Web3 Games — Kumami World',
    description:
      'Explore the best Web3 and crypto games curated by Kumami World.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function GamesPage() {
  return (
    <>
      <GamesPortal />
      <Footer />
    </>
  )
}
