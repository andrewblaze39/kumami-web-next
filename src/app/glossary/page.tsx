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
    images: ['https://kumami.world/og-default.png'],
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
