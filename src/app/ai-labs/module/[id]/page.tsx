import type { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Footer from '@/components/Footer'
import ProtectedRoute from '@/components/ProtectedRoute'
import AIModuleArticleView from '@/components/AIModuleArticleView'
import { Suspense } from 'react'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const snap = await getDoc(doc(db, 'ai_modules', id))
  const data = snap.exists() ? snap.data() : null
  const title = data?.title
    ? `${data.title} — Kumami AI Labs`
    : 'AI Module — Kumami World'
  const description =
    (data?.description as string | undefined) ??
    'Learn with Kumami AI Labs modules.'
  const image =
    (data?.thumbnail as string | undefined) ??
    'https://kumami.world/og-default.png'
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://kumami.world/ai-labs/module/${id}`,
      images: [image],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function AIModuleArticlePage({ params }: Props) {
  const { id } = await params
  return (
    <>
      <ProtectedRoute>
        <Suspense fallback={null}>
          <AIModuleArticleView moduleId={id} />
        </Suspense>
      </ProtectedRoute>
      <Footer />
    </>
  )
}
