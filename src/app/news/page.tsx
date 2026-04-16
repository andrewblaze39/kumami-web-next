import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import NewsGrid from '@/components/NewsGrid'

export const metadata: Metadata = {
  title: 'Crypto News — Kumami World',
  description:
    'Stay up to date with the latest crypto and Web3 news curated by Kumami World.',
  openGraph: {
    title: 'Crypto News — Kumami World',
    description:
      'Stay up to date with the latest crypto and Web3 news curated by Kumami World.',
    url: 'https://kumami.world/news',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crypto News — Kumami World',
    description:
      'Stay up to date with the latest crypto and Web3 news curated by Kumami World.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function NewsPage() {
  return (
    <>
      <NewsGrid />
      <Footer />
    </>
  )
}
