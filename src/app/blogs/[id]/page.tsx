import type { Metadata } from 'next'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Footer from '@/components/Footer'
import BlogArticleView from '@/components/BlogArticleView'

interface PageProps {
  params: Promise<{ id: string }>
}

interface BlogMetaDoc {
  title?: string
  summary?: string
  excerpt?: string
  content1?: string
  content?: string
  imageUrl?: string
  detailImageUrl?: string
  thumbnailImageUrl?: string
  category?: string
  author?: string
  timestamp?: Timestamp | { seconds: number; nanoseconds: number }
}

async function fetchBlogForMeta(
  id: string
): Promise<BlogMetaDoc | null> {
  try {
    const snap = await getDoc(doc(db, 'blogs', id))
    if (!snap.exists()) return null
    return snap.data() as BlogMetaDoc
  } catch (err) {
    console.error('Error fetching blog post for metadata:', err)
    return null
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const article = await fetchBlogForMeta(id)

  const fallbackTitle = 'Blog — Kumami World'
  const fallbackDescription =
    'Blog posts and updates from the Kumami World team.'
  const fallbackImage = 'https://kumami.world/og-default.png'
  const url = `https://kumami.world/blogs/${id}`

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
    ? `${article.title} — Kumami Blog`
    : fallbackTitle

  const rawDescription =
    article.summary ||
    (article.content1 || article.content
      ? (article.content1 || article.content || '')
          .replace(/[#*_>`~\[\]()!-]/g, '')
          .trim()
          .substring(0, 160)
      : '') ||
    fallbackDescription

  const description =
    rawDescription.length > 160
      ? `${rawDescription.substring(0, 157)}...`
      : rawDescription

  const ogImage =
    article.detailImageUrl ||
    article.thumbnailImageUrl ||
    article.imageUrl ||
    fallbackImage

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

export default async function BlogDetailPage({ params }: PageProps) {
  const { id } = await params
  const article = await fetchBlogForMeta(id)

  const publishedTime = article?.timestamp
    ? new Date((article.timestamp as { seconds: number }).seconds * 1000).toISOString()
    : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article?.title ?? 'Kumami World',
    description: article?.summary || article?.excerpt || '',
    image: article?.detailImageUrl || article?.thumbnailImageUrl || article?.imageUrl
      ? [article?.detailImageUrl || article?.thumbnailImageUrl || article?.imageUrl]
      : ['https://kumami.world/og-default.png'],
    url: `https://kumami.world/blogs/${id}`,
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
      '@id': `https://kumami.world/blogs/${id}`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogArticleView articleId={id} />
      <Footer />
    </>
  )
}
