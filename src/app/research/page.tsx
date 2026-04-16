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
    images: ['https://kumami.world/og-default.png'],
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
