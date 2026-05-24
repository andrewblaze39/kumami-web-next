import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'AI Submissions — Kumami World',
  description:
    'Submit your AI project to Kumami World for review, evaluation, and incubation support from our team and partner AI incubators.',
  alternates: { canonical: 'https://kumami.world/ai-labs/submission' },
  openGraph: {
    title: 'AI Submissions — Kumami World',
    description:
      'Submit your AI project to Kumami World for review, evaluation, and incubation support from our team and partner AI incubators.',
    url: 'https://kumami.world/ai-labs/submission',
    siteName: 'Kumami World',
    locale: 'en_US',
    images: [{ url: 'https://kumami.world/og-default.png', width: 1200, height: 630, alt: 'AI Submissions — Kumami World' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Submissions — Kumami World',
    description:
      'Submit your AI project to Kumami World for review, evaluation, and incubation support from our team and partner AI incubators.',
    images: ['https://kumami.world/og-default.png'],
  },
}

export default function AISubmissionPage() {
  return (
    <>
      <ComingSoon pageName="AI Submissions" />
      <Footer />
    </>
  )
}
