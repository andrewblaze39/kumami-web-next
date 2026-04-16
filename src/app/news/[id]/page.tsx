import type { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Footer from '@/components/Footer'
import NewsArticleView from '@/components/NewsArticleView'

interface PageProps {
  params: Promise<{ id: string }>
}

interface NewsArticleMetaDoc {
  title?: string
  summary?: string
  excerpt?: string
  content?: string
  imageUrl?: string
  category?: string
}

async function fetchArticleForMeta(
  id: string
): Promise<NewsArticleMetaDoc | null> {
  try {
    const snap = await getDoc(doc(db, 'news', id))
    if (!snap.exists()) return null
    return snap.data() as NewsArticleMetaDoc
  } catch (err) {
    console.error('Error fetching news article for metadata:', err)
    return null
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const article = await fetchArticleForMeta(id)

  const fallbackTitle = 'Kumami News — Crypto & Web3 News'
  const fallbackDescription =
    'Stay up to date with the latest crypto and Web3 news curated by Kumami World.'
  const fallbackImage = 'https://kumami.world/og-default.png'

  if (!article) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        url: `https://kumami.world/news/${id}`,
        images: [fallbackImage],
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
    ? `${article.title} — Kumami News`
    : fallbackTitle

  const rawDescription =
    article.summary ||
    article.excerpt ||
    (article.content
      ? article.content.replace(/[#*_>`~\[\]()!-]/g, '').trim().substring(0, 160)
      : '') ||
    fallbackDescription

  const description =
    rawDescription.length > 160
      ? `${rawDescription.substring(0, 157)}...`
      : rawDescription

  const ogImage = article.imageUrl || fallbackImage
  const url = `https://kumami.world/news/${id}`

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

export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <>
      <NewsArticleView articleId={id} />
      <Footer />
    </>
  )
}
