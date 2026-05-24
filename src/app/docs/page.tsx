import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Documentation — Kumami World',
  description: 'Kumami World platform documentation and guides.',
  openGraph: {
    title: 'Documentation — Kumami World',
    description: 'Kumami World platform documentation and guides.',
    url: 'https://kumami.world/docs',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Documentation — Kumami World' }],
  },
  alternates: {
    canonical: 'https://kumami.world/docs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Documentation — Kumami World',
    description: 'Kumami World platform documentation and guides.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function DocsPage() {
  return (
    <>
      <ComingSoon pageName="Documentation" />
      <Footer />
    </>
  )
}
