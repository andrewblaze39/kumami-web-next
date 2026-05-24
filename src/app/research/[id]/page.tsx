import type { Metadata } from 'next'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
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
  author?: string
  timestamp?: Timestamp | { seconds: number; nanoseconds: number }
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
  const url = `https://kumami.world/research/${id}`

  if (!article) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      alternates: { canonical: url },
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        url,
        siteName: 'Kumami World',
        locale: 'en_US',
        images: [{ url: fallbackImage, width: 1200, height: 630, alt: 'Kumami World' }],
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

  const publishedTime = article.timestamp
    ? new Date((article.timestamp as { seconds: number }).seconds * 1000).toISOString()
    : undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title || fallbackTitle,
      description,
      url,
      siteName: 'Kumami World',
      locale: 'en_US',
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title || 'Kumami World' }],
      type: 'article',
      ...(publishedTime && { publishedTime }),
      ...(article.category && { section: article.category }),
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
  const article = await fetchResearchForMeta(id)

  const publishedTime = article?.timestamp
    ? new Date((article.timestamp as { seconds: number }).seconds * 1000).toISOString()
    : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article?.title ?? 'Kumami World',
    description: article?.summary || article?.description || '',
    image: article?.imageUrl || article?.detailImageUrl
      ? [article?.imageUrl || article?.detailImageUrl]
      : ['https://kumami.world/og-default.png'],
    url: `https://kumami.world/research/${id}`,
    ...(publishedTime && { datePublished: publishedTime, dateModified: publishedTime }),
    author: {
      '@type': 'Organization',
      name: article?.author || 'Kumami World',
      url: 'https://kumami.world',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kumami World',
      url: 'https://kumami.world',
      logo: { '@type': 'ImageObject', url: 'https://kumami.world/logo.png' },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://kumami.world/research/${id}`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ResearchArticleView articleId={id} />
      <Footer />
    </>
  )
}
