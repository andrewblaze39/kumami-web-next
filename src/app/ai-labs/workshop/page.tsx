import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'AI Workshops — Kumami World',
  description: 'Hands-on AI workshops and tutorials to master machine learning, generative AI, and Web3 intelligence tools on Kumami World.',
  openGraph: {
    title: 'AI Workshops — Kumami World',
    description: 'Hands-on AI workshops and tutorials to master machine learning, generative AI, and Web3 intelligence tools on Kumami World.',
    url: 'https://kumami.world/ai-labs/workshop',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Workshops — Kumami World',
    description: 'Hands-on AI workshops and tutorials to master machine learning, generative AI, and Web3 intelligence tools on Kumami World.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function AIWorkshopPage() {
  return (
    <>
      <ComingSoon pageName="AI Workshops" />
      <Footer />
    </>
  )
}
