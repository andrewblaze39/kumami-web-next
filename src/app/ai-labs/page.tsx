import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import AILabsContent from '@/components/AILabsContent'

export const metadata: Metadata = {
  title: 'AI Labs — Kumami World',
  description: 'Explore cutting-edge AI tools and workshops from Kumami World\'s AI Labs.',
  openGraph: {
    title: 'AI Labs — Kumami World',
    description: 'Explore cutting-edge AI tools and workshops from Kumami World\'s AI Labs.',
    url: 'https://kumami.world/ai-labs',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Labs — Kumami World',
    description: 'Explore cutting-edge AI tools and workshops from Kumami World\'s AI Labs.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function AILabsPage() {
  return (
    <>
      <AILabsContent />
      <Footer />
    </>
  )
}
