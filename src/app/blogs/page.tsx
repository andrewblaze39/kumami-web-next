import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import BlogsGrid from '@/components/BlogsGrid'

export const metadata: Metadata = {
  title: 'Blog — Kumami World',
  description:
    'Insights, updates, and stories from the Kumami World team.',
  openGraph: {
    title: 'Blog — Kumami World',
    description:
      'Insights, updates, and stories from the Kumami World team.',
    url: 'https://kumami.world/blogs',
    images: ['https://kumami.world/og-default.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Kumami World',
    description:
      'Insights, updates, and stories from the Kumami World team.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function BlogsPage() {
  return (
    <>
      <BlogsGrid />
      <Footer />
    </>
  )
}
