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
    images: ['https://kumami.world/og-default.png'],
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
