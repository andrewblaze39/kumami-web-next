import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import AllNewsGrid from '@/components/AllNewsGrid'

export const metadata: Metadata = {
  title: 'All News — Kumami World',
  description:
    'Browse all crypto and Web3 news articles on Kumami World.',
  openGraph: {
    title: 'All News — Kumami World',
    description:
      'Browse all crypto and Web3 news articles on Kumami World.',
    url: 'https://kumami.world/all-news',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All News — Kumami World',
    description:
      'Browse all crypto and Web3 news articles on Kumami World.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function AllNewsPage() {
  return (
    <>
      <AllNewsGrid />
      <Footer />
    </>
  )
}
