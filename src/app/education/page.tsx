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
    images: ['https://kumami.world/og-default.png'],
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
