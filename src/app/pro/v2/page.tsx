import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ProOnlyRoute from '@/components/ProOnlyRoute'
import ProDashboardV2 from '@/components/ProDashboardV2'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Pro Dashboard V2 — Kumami World',
  description: 'Your redesigned premium crypto portfolio dashboard with AI insights, market analysis, and alpha room.',
  openGraph: {
    title: 'Pro Dashboard V2 — Kumami World',
    description: 'Your redesigned premium crypto portfolio dashboard with AI insights, market analysis, and alpha room.',
    url: 'https://kumami.world/pro/v2',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pro Dashboard V2 — Kumami World',
    description: 'Your redesigned premium crypto portfolio dashboard with AI insights, market analysis, and alpha room.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function ProV2Page() {
  return (
    <>
      <Suspense fallback={null}>
        <ProOnlyRoute>
          <ProDashboardV2 />
        </ProOnlyRoute>
      </Suspense>
      <Footer />
    </>
  )
}
