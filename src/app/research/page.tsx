import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ResearchGrid from '@/components/ResearchGrid'

export const metadata: Metadata = {
  title: 'Research — Kumami World',
  description:
    'In-depth crypto and Web3 research articles from the Kumami World team.',
  openGraph: {
    title: 'Research — Kumami World',
    description:
      'In-depth crypto and Web3 research articles from the Kumami World team.',
    url: 'https://kumami.world/research',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Research — Kumami World' }],
  },
  alternates: {
    canonical: 'https://kumami.world/research',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Research — Kumami World',
    description:
      'In-depth crypto and Web3 research articles from the Kumami World team.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function ResearchPage() {
  return (
    <>
      <ResearchGrid />
      <Footer />
    </>
  )
}
