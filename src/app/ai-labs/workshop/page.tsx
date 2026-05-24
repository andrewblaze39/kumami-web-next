import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'AI Workshops — Kumami World',
  description: 'Hands-on AI workshops and tutorials to master machine learning, generative AI, and Web3 intelligence tools on Kumami World.',
  alternates: { canonical: 'https://kumami.world/ai-labs/workshop' },
  openGraph: {
    title: 'AI Workshops — Kumami World',
    description: 'Hands-on AI workshops and tutorials to master machine learning, generative AI, and Web3 intelligence tools on Kumami World.',
    url: 'https://kumami.world/ai-labs/workshop',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'AI Workshops — Kumami World' }],
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
