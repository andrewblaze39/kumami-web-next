import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import AILabsContent from '@/components/AILabsContent'

export const metadata: Metadata = {
  title: 'AI Labs — Kumami World',
  description: 'Explore cutting-edge AI tools and workshops from Kumami World\'s AI Labs.',
  alternates: { canonical: 'https://kumami.world/ai-labs' },
  openGraph: {
    title: 'AI Labs — Kumami World',
    description: 'Explore cutting-edge AI tools and workshops from Kumami World\'s AI Labs.',
    url: 'https://kumami.world/ai-labs',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'AI Labs — Kumami World' }],
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
