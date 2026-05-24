import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import GlossaryGrid from '@/components/GlossaryGrid'

export const metadata: Metadata = {
  title: 'Crypto Glossary — Kumami World',
  description: 'A comprehensive glossary of crypto, Web3, blockchain, DeFi, and NFT terms. Learn the language of decentralized finance.',
  openGraph: {
    title: 'Crypto Glossary — Kumami World',
    description: 'A comprehensive glossary of crypto, Web3, blockchain, DeFi, and NFT terms.',
    url: 'https://kumami.world/glossary',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Crypto Glossary — Kumami World' }],
  },
  alternates: {
    canonical: 'https://kumami.world/glossary',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crypto Glossary — Kumami World',
    description: 'A comprehensive glossary of crypto, Web3, blockchain, DeFi, and NFT terms.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function GlossaryPage() {
  return (
    <>
      <GlossaryGrid />
      <Footer />
    </>
  )
}
