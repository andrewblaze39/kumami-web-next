import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import AIModulesGrid from '@/components/AIModulesGrid'

export const metadata: Metadata = {
  title: 'AI Modules — Kumami World',
  description:
    'Explore AI modules and hands-on workshops from Kumami World\'s AI Labs.',
  alternates: { canonical: 'https://kumami.world/ai-labs/module' },
  openGraph: {
    title: 'AI Modules — Kumami World',
    description:
      'Explore AI modules and hands-on workshops from Kumami World\'s AI Labs.',
    url: 'https://kumami.world/ai-labs/module',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'AI Modules — Kumami World' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Modules — Kumami World',
    description:
      'Explore AI modules and hands-on workshops from Kumami World\'s AI Labs.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function AIModulesPage() {
  return (
    <>
      <AIModulesGrid />
      <Footer />
    </>
  )
}
