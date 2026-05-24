import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import PartnersGrid from '@/components/PartnersGrid'
import PartnerPortal from '@/components/PartnerPortal'

export const metadata: Metadata = {
  title: 'Partners — Kumami World',
  description:
    "Meet Kumami World's ecosystem partners and collaborators.",
  openGraph: {
    title: 'Partners — Kumami World',
    description:
      "Meet Kumami World's ecosystem partners and collaborators.",
    url: 'https://kumami.world/all-partners',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'Partners — Kumami World' }],
  },
  alternates: {
    canonical: 'https://kumami.world/all-partners',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Partners — Kumami World',
    description:
      "Meet Kumami World's ecosystem partners and collaborators.",
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function AllPartnersPage() {
  return (
    <>
      <PartnersGrid />
      <PartnerPortal />
      <Footer />
    </>
  )
}
