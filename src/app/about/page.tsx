import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import AboutContent from '@/components/AboutContent'

const TITLE = 'About Kumami World — Web3 Platform'
const DESCRIPTION =
  'Learn about Kumami World — our mission, products, and vision for making Web3 accessible through education, news, games, AI Labs, and community.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://kumami.world/about',
    type: 'website',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://kumami.world/og-default.png'],
  },
  alternates: {
    canonical: 'https://kumami.world/about',
  },
}

export default function AboutPage() {
  return (
    <>
      <AboutContent />
      <Footer />
    </>
  )
}
