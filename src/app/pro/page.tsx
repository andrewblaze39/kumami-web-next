import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ProOnlyRoute from '@/components/ProOnlyRoute'
import ProDashboard from '@/components/ProDashboard'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Pro Dashboard — Kumami World',
  description: 'Your premium crypto portfolio dashboard with AI insights, market analysis, and alpha room.',
  openGraph: {
    title: 'Pro Dashboard — Kumami World',
    description: 'Your premium crypto portfolio dashboard with AI insights, market analysis, and alpha room.',
    url: 'https://kumami.world/pro',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pro Dashboard — Kumami World',
    description: 'Your premium crypto portfolio dashboard with AI insights, market analysis, and alpha room.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function ProPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ProOnlyRoute>
          <ProDashboard />
        </ProOnlyRoute>
      </Suspense>
      <Footer />
    </>
  )
}
