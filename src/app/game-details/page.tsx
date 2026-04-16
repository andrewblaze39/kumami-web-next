import type { Metadata } from 'next'
import { Suspense } from 'react'
import Footer from '@/components/Footer'
import ProtectedRoute from '@/components/ProtectedRoute'
import GameDetailView from '@/components/GameDetailView'

export const metadata: Metadata = {
  title: 'Game Details — Kumami World',
  description: 'Explore game details, features, and more on Kumami World Game Zone.',
  openGraph: {
    title: 'Game Details — Kumami World',
    description: 'Explore game details, features, and more on Kumami World Game Zone.',
    url: 'https://kumami.world/game-details',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Game Details — Kumami World',
    description: 'Explore game details, features, and more on Kumami World Game Zone.',
    images: ['https://kumami.world/og-default.png'],
  },
}

interface Props {
  searchParams: Promise<{ name?: string }>
}

export default async function GameDetailsPage({ searchParams }: Props) {
  const { name } = await searchParams
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-[#101010]" />}>
        <GameDetailView gameName={name} />
      </Suspense>
      <Footer />
    </ProtectedRoute>
  )
}
