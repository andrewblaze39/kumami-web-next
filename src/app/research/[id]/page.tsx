import type { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Footer from '@/components/Footer'
import ResearchArticleView from '@/components/ResearchArticleView'

interface PageProps {
  params: Promise<{ id: string }>
}

interface ResearchArticleMetaDoc {
  title?: string
  summary?: string
  description?: string
  content1?: string
  content2?: string
  imageUrl?: string
  detailImageUrl?: string
  category?: string
}

async function fetchResearchForMeta(
  id: string
): Promise<ResearchArticleMetaDoc | null> {
  try {
    const snap = await getDoc(doc(db, 'research_articles', id))
    if (!snap.exists()) return null
    return snap.data() as ResearchArticleMetaDoc
  } catch (err) {
    console.error('Error fetching research article for metadata:', err)
    return null
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const article = await fetchResearchForMeta(id)

  const fallbackTitle = 'Crypto Research — Kumami World'
  const fallbackDescription =
    'In-depth crypto and Web3 research articles from the Kumami World team.'
  const fallbackImage = 'https://kumami.world/og-default.png'

  if (!article) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        url: `https://kumami.world/research/${id}`,
        images: [fallbackImage],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: fallbackTitle,
        description: fallbackDescription,
        images: [fallbackImage],
      },
    }
  }

  const title = article.title
    ? `${article.title} — Kumami Research`
    : fallbackTitle

  const rawDescription =
    article.summary ||
    article.description ||
    (article.content1
      ? article.content1
          .replace(/[#*_>`~\[\]()!-]/g, '')
          .trim()
          .substring(0, 160)
      : '') ||
    fallbackDescription

  const description =
    rawDescription.length > 160
      ? `${rawDescription.substring(0, 157)}...`
      : rawDescription

  const ogImage = article.imageUrl || article.detailImageUrl || fallbackImage
  const url = `https://kumami.world/research/${id}`

  return {
    title,
    description,
    openGraph: {
      title: article.title || fallbackTitle,
      description,
      url,
      images: [ogImage],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title || fallbackTitle,
      description,
      images: [ogImage],
    },
  }
}

export default async function ResearchDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <>
      <ResearchArticleView articleId={id} />
      <Footer />
    </>
  )
}
