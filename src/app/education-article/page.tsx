import type { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import EducationArticleView from '@/components/EducationArticleView'

interface PageProps {
  searchParams: Promise<{ id?: string }>
}

interface ArticleSectionContent {
  type: 'paragraph' | 'image' | 'youtube'
  text?: string
  src?: string
  alt?: string
  caption?: string
  videoId?: string
  title?: string
}

interface ArticleSection {
  title: string
  content: ArticleSectionContent[]
}

export interface ArticleDoc {
  title?: string
  description?: string
  author?: string
  level?: string
  thumbnail?: string
  imageUrl?: string
  sections?: ArticleSection[]
}

async function fetchArticle(id: string): Promise<ArticleDoc | null> {
  try {
    const snap = await getDoc(doc(db, 'education_articles', id))
    if (!snap.exists()) return null
    return snap.data() as ArticleDoc
  } catch (err) {
    console.error('Error fetching article for metadata:', err)
    return null
  }
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams
  const educationId = params.id || '1'
  const article = await fetchArticle(educationId)

  const title = article?.title
    ? `${article.title} — Kumami Education`
    : 'Learn Web3 — Kumami Education'
  const description =
    article?.description ||
    article?.sections?.[0]?.content?.[0]?.text?.substring(0, 160) ||
    'Level up your crypto and Web3 knowledge with Kumami Education.'
  const ogImage =
    article?.thumbnail || article?.imageUrl || 'https://kumami.world/og-default.png'
  const url = `https://kumami.world/education-article?id=${educationId}`

  return {
    title,
    description,
    openGraph: {
      title: article?.title || 'Learn Web3 — Kumami Education',
      description,
      url,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: article?.title || 'Learn Web3 — Kumami Education',
      description,
      images: [ogImage],
    },
  }
}

export default async function EducationArticleRoute({ searchParams }: PageProps) {
  const params = await searchParams
  const educationId = params.id || '1'
  return <EducationArticleView educationId={educationId} />
}
