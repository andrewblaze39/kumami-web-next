import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Gaming Guild — Kumami World',
  description: 'Join the Kumami World Gaming Guild community and compete together.',
  openGraph: {
    title: 'Gaming Guild — Kumami World',
    description: 'Join the Kumami World Gaming Guild community and compete together.',
    url: 'https://kumami.world/gaming-guild',
    images: ['https://kumami.world/og-default.png'],
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
