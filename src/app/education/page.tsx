import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import EducationGrid from '@/components/EducationGrid'

export const metadata: Metadata = {
  title: 'Learn Web3 — Kumami Education',
  description:
    "Level up your crypto and Web3 knowledge with Kumami's free education courses.",
  openGraph: {
    title: 'Learn Web3 — Kumami Education',
    description:
      "Level up your crypto and Web3 knowledge with Kumami's free education courses.",
    url: 'https://kumami.world/education',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Learn Web3 — Kumami Education' }],
  },
  alternates: {
    canonical: 'https://kumami.world/education',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn Web3 — Kumami Education',
    description:
      "Level up your crypto and Web3 knowledge with Kumami's free education courses.",
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function EducationPage() {
  return (
    <>
      <EducationGrid />
      <Footer />
    </>
  )
}
