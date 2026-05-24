import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Gaming Guild — Kumami World',
  description: 'Join the Kumami World Gaming Guild community and compete together.',
  alternates: { canonical: 'https://kumami.world/gaming-guild' },
  openGraph: {
    title: 'Gaming Guild — Kumami World',
    description: 'Join the Kumami World Gaming Guild community and compete together.',
    url: 'https://kumami.world/gaming-guild',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Gaming Guild — Kumami World' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaming Guild — Kumami World',
    description: 'Join the Kumami World Gaming Guild community and compete together.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function GamingGuildPage() {
  return (
    <>
      <ComingSoon pageName="Gaming Guild" />
      <Footer />
    </>
  )
}
