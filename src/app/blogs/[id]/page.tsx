import type { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Footer from '@/components/Footer'
import BlogArticleView from '@/components/BlogArticleView'

interface PageProps {
  params: Promise<{ id: string }>
}

interface BlogMetaDoc {
  title?: string
  summary?: string
  content1?: string
  content?: string
  imageUrl?: string
  detailImageUrl?: string
  thumbnailImageUrl?: string
  category?: string
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

  if (!article) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        url: `https://kumami.world/blogs/${id}`,
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
  const url = `https://kumami.world/blogs/${id}`

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

export default async function BlogDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <>
      <BlogArticleView articleId={id} />
      <Footer />
    </>
  )
}
