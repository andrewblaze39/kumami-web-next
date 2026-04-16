import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import PartnersGrid from '@/components/PartnersGrid'

export const metadata: Metadata = {
  title: 'Partners — Kumami World',
  description:
    "Meet Kumami World's ecosystem partners and collaborators.",
  openGraph: {
    title: 'Partners — Kumami World',
    description:
      "Meet Kumami World's ecosystem partners and collaborators.",
    url: 'https://kumami.world/partners',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Partners — Kumami World',
    description:
      "Meet Kumami World's ecosystem partners and collaborators.",
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function PartnersPage() {
  return (
    <>
      <PartnersGrid />
      <Footer />
    </>
  )
}
