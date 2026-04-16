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
    images: ['https://kumami.world/og-default.png'],
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
