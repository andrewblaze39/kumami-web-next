import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import TermsContent from '@/components/TermsContent'

export const metadata: Metadata = {
  title: 'Terms of Service — Kumami World',
  description:
    'Terms of Service and conditions for using Kumami World platform.',
  openGraph: {
    title: 'Terms of Service — Kumami World',
    description:
      'Terms of Service and conditions for using Kumami World platform.',
    url: 'https://kumami.world/terms',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Terms of Service — Kumami World' }],
  },
  alternates: {
    canonical: 'https://kumami.world/terms',
  },
  robots: {
    index: false,
    follow: false,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service — Kumami World',
    description:
      'Terms of Service and conditions for using Kumami World platform.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function TermsPage() {
  return (
    <>
      <TermsContent />
      <Footer />
    </>
  )
}
