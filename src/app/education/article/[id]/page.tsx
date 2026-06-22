import type { Metadata } from 'next'
import { Suspense } from 'react'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import EducationArticleRenderer from '@/components/education/EducationArticleRenderer'
import Link from 'next/link'
import { resolveLevelNumber, getChapterName } from '@/lib/educationUtils'

interface Props {
  params: Promise<{ id: string }>
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

interface ArticleDoc {
  title?: string
  description?: string
  author?: string
  level?: number | string
  chapterIndex?: number
  thumbnail?: string
  imageUrl?: string
  sections?: ArticleSection[]
  blurb?: string
  minutes?: number
  status?: string
}

async function fetchArticle(id: string): Promise<ArticleDoc | null> {
  try {
    const snap = await getDoc(doc(db, 'education_articles', id))
    if (!snap.exists()) return null
    return snap.data() as ArticleDoc
  } catch (err) {
    console.error('Error fetching education article:', err)
    return null
  }
}

async function fetchSiblingIds(
  articleId: string,
  levelNum: number
): Promise<{ prevId: string | null; nextId: string | null }> {
  try {
    const q = query(
      collection(db, 'education_articles'),
      where('level', '==', levelNum),
      where('status', '==', 'published')
    )
    const snap = await getDocs(q)
    const sameLevel = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as { id: string; chapterIndex?: number; comingSoon?: boolean }))
      .filter(a => !a.comingSoon)
      .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0))
    const idx = sameLevel.findIndex(a => a.id === articleId)
    return {
      prevId: idx > 0 ? sameLevel[idx - 1].id : null,
      nextId: idx !== -1 && idx < sameLevel.length - 1 ? sameLevel[idx + 1].id : null,
    }
  } catch {
    return { prevId: null, nextId: null }
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const article = await fetchArticle(id)
  const title = article?.title
    ? `${article.title} — Kumami Education`
    : 'Learn Web3 — Kumami Education'
  const description =
    article?.description ||
    article?.sections?.[0]?.content?.[0]?.text?.substring(0, 160) ||
    'Level up your crypto and Web3 knowledge with Kumami Education.'
  const ogImage =
    article?.thumbnail || article?.imageUrl || 'https://kumami.world/og-default.png'
  return {
    title,
    description,
    openGraph: {
      title: article?.title || 'Learn Web3 — Kumami Education',
      description,
      url: `https://kumami.world/education/article/${id}`,
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

function ArticleNotFound() {
  return (
    <div className="edu-content">
      <div className="edu-art-not-found">
        <div className="edu-art-not-found-icon">!</div>
        <h2>Article not found</h2>
        <p>This article does not exist or has been removed.</p>
        <Link href="/education" className="edu-btn edu-btn-primary" style={{ marginTop: 20 }}>
          Back to Education
        </Link>
      </div>
    </div>
  )
}

async function ArticlePageContent({ id }: { id: string }) {
  const article = await fetchArticle(id)
  if (!article) return <ArticleNotFound />

  const levelNum = resolveLevelNumber(article.level)
  const { prevId, nextId } = levelNum !== null
    ? await fetchSiblingIds(id, levelNum)
    : { prevId: null, nextId: null }

  const chapterName = levelNum !== null && article.chapterIndex !== undefined
    ? getChapterName(levelNum, article.chapterIndex)
    : undefined

  return (
    <EducationArticleRenderer
      article={{
        title: article.title || 'Untitled',
        description: article.description,
        author: article.author,
        level: article.level,
        chapterIndex: article.chapterIndex,
        thumbnail: article.thumbnail || article.imageUrl,
        sections: article.sections,
        blurb: article.blurb,
        minutes: article.minutes,
      }}
      articleId={id}
      prevArticleId={prevId}
      nextArticleId={nextId}
      levelNum={levelNum ?? undefined}
      chapterName={chapterName}
      chapterIndex={article.chapterIndex}
    />
  )
}

export default async function EducationArticlePage({ params }: Props) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <div className="edu-content">
          <div className="edu-art-loading">
            <div className="edu-art-spinner" />
            <span>Loading article…</span>
          </div>
        </div>
      }
    >
      <ArticlePageContent id={id} />
    </Suspense>
  )
}
