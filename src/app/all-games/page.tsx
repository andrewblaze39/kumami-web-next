import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import AllGamesGrid from '@/components/AllGamesGrid'

export const metadata: Metadata = {
  title: 'All Games — Kumami World',
  description:
    'Browse every game available on Kumami World Game Zone.',
  alternates: { canonical: 'https://kumami.world/all-games' },
  openGraph: {
    title: 'All Games — Kumami World',
    description:
      'Browse every game available on Kumami World Game Zone.',
    url: 'https://kumami.world/all-games',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'All Games — Kumami World' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Games — Kumami World',
    description:
      'Browse every game available on Kumami World Game Zone.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function AllGamesPage() {
  return (
    <>
      <AllGamesGrid />
      <Footer />
    </>
  )
}
