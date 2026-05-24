import type { Metadata } from 'next'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Subscribe — Kumami World',
  description: 'Kumami Pro subscription is coming soon.',
}

export default function SubscribePage() {
  return (
    <>
      <div className="min-h-screen bg-[#101010] flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/comingsoon.png"
          alt="Coming Soon"
          className="w-full max-w-[900px] h-auto rounded-3xl object-cover px-4"
        />
      </div>
      <Footer />
    </>
  )
}
