import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ProfileContent from '@/components/ProfileContent'
import ProtectedRoute from '@/components/ProtectedRoute'

const TITLE = 'My Profile — Kumami World'
const DESCRIPTION =
  'Manage your Kumami World account, subscription, and referrals.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://kumami.world/profile',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://kumami.world/og-default.png'],
  },
  alternates: {
    canonical: 'https://kumami.world/profile',
  },
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
      <Footer />
    </ProtectedRoute>
  )
}
