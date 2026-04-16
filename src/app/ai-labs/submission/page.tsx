import type { Metadata } from 'next'
import Footer from '@/components/Footer'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'AI Submissions — Kumami World',
  description:
    'Submit your AI project to Kumami World for review, evaluation, and incubation support from our team and partner AI incubators.',
  openGraph: {
    title: 'AI Submissions — Kumami World',
    description:
      'Submit your AI project to Kumami World for review, evaluation, and incubation support from our team and partner AI incubators.',
    url: 'https://kumami.world/ai-labs/submission',
    images: ['https://kumami.world/og-default.png'],
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
