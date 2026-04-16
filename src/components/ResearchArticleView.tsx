'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Loader } from 'lucide-react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ---------- Types ----------

interface FirestoreTimestampLike {
  seconds?: number
  nanoseconds?: number
  toDate?: () => Date
  toMillis?: () => number
}

interface ResearchArticle {
  id: string
  title?: string
  summary?: string
  description?: string
  content1?: string
  content2?: string
  category?: string
  imageUrl?: string
  detailImageUrl?: string
  isPremium?: boolean
  status?: string
  author?: string
  createdAt?: FirestoreTimestampLike
  date?: FirestoreTimestampLike
  timestamp?: FirestoreTimestampLike
}

interface Props {
  articleId: string
}

// ---------- Date formatting ----------

function coerceToDate(
  timestamp: FirestoreTimestampLike | undefined
): Date | null {
  if (!timestamp) return null
  if (typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000)
  }
  if (typeof timestamp.toDate === 'function') {
    const d = timestamp.toDate()
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d
  }
  return null
}

function formatFullTimestamp(
  timestamp: FirestoreTimestampLike | undefined
): string {
  const date = coerceToDate(timestamp)
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatShortTimestamp(
  timestamp: FirestoreTimestampLike | undefined,
  now = new Date()
): string {
  const date = coerceToDate(timestamp)
  if (!date) return ''

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfThatDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )

  const diffMs = startOfToday.getTime() - startOfThatDay.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`

  const sameYear = now.getFullYear() === date.getFullYear()
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

// ---------- Lightweight markdown to HTML ----------
// Copied from NewsArticleView to match the CRA MarkdownRenderer behaviour.

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_(?!\s)([^_\n]+?)_(?!_)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
      const safeHref = href.replace(/"/g, '&quot;')
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="text-[#40e0d0] hover:underline">${label}</a>`
    })
}

function renderMarkdown(text: string | undefined): string {
  if (!text) return ''
  const normalized = text
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')

  const blocks = normalized.split(/\n{2,}/)
  return blocks
    .map((block) => {
      const lines = block.split('\n')
      const isBulletBlock = lines.every((l) =>
        /^\s*[-*•]\s+/.test(l) || l.trim() === ''
      )
      if (isBulletBlock && lines.some((l) => /^\s*[-*•]\s+/.test(l))) {
        const items = lines
          .filter((l) => /^\s*[-*•]\s+/.test(l))
          .map(
            (l) =>
              `<li>${parseInline(
                escapeHtml(l.replace(/^\s*[-*•]\s+/, ''))
              )}</li>`
          )
          .join('')
        return `<ul class="list-disc list-outside ml-6 my-3 space-y-1">${items}</ul>`
      }

      const heading = block.match(/^(#{1,6})\s+(.*)$/)
      if (heading) {
        const level = heading[1].length
        const body = parseInline(escapeHtml(heading[2]))
        const size =
          level <= 2
            ? 'text-2xl md:text-3xl'
            : level === 3
            ? 'text-xl md:text-2xl'
            : 'text-lg'
        return `<h${level} class="${size} font-bold mt-8 mb-3 text-white">${body}</h${level}>`
      }

      return `<p class="mb-4 leading-relaxed text-gray-200">${parseInline(
        escapeHtml(block).replace(/\n/g, '<br />')
      )}</p>`
    })
    .join('')
}

// ---------- Component ----------

export default function ResearchArticleView({ articleId }: Props) {
  const router = useRouter()
  const [article, setArticle] = useState<ResearchArticle | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<ResearchArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const articleRef = doc(db, 'research_articles', articleId)
      const articleSnap = await getDoc(articleRef)

      if (!articleSnap.exists()) {
        setError('Research article not found')
        return
      }

      const data = articleSnap.data() as Omit<ResearchArticle, 'id'>
      setArticle({ id: articleSnap.id, ...data })

      // Related research (latest 6 by createdAt desc, drop current, drop drafts, take 5)
      try {
        const researchRef = collection(db, 'research_articles')
        const relatedQuery = query(
          researchRef,
          orderBy('createdAt', 'desc'),
          limit(6)
        )
        const relatedSnap = await getDocs(relatedQuery)
        const related: ResearchArticle[] = relatedSnap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ResearchArticle, 'id'>),
          }))
          .filter(
            (item) => item.id !== articleSnap.id && item.status !== 'draft'
          )
          .slice(0, 5)
        setRelatedArticles(related)
      } catch (err) {
        console.error('Error fetching related research:', err)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Error fetching research article:', err)
      setError(`Failed to load article: ${message}`)
    } finally {
      setLoading(false)
    }
  }, [articleId])

  useEffect(() => {
    fetchArticle()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [fetchArticle])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010] text-white pt-28 pb-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#96EDD6]" />
          <p className="text-xl text-gray-300">Loading research...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !article) {
    return (
      <div className="min-h-screen bg-[#101010] text-white pt-28 pb-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl px-4">
          <div className="text-6xl">!</div>
          <h2 className="text-2xl font-bold text-[#96EDD6]">
            {error || 'Research article not found'}
          </h2>
          <Link
            href="/research"
            className="mt-4 px-6 py-3 bg-[#96EDD6] text-[#101010] rounded-lg hover:bg-[#96EDD6]/80 transition-all font-semibold no-underline"
          >
            Back to Research
          </Link>
        </div>
      </div>
    )
  }

  const bodyOneHtml = renderMarkdown(article.content1)
  const bodyTwoHtml = renderMarkdown(article.content2)
  const articleTimestamp =
    article.createdAt || article.date || article.timestamp
  const formattedFullDate = formatFullTimestamp(articleTimestamp)

  return (
    <div className="min-h-screen bg-[#101010] text-white pt-10 md:pt-16 lg:pt-20 pb-16">
      <div className="max-w-[1000px] mx-auto px-4 md:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm md:text-base">
          <Link
            href="/"
            className="text-gray-400 hover:text-[#96EDD6] transition-colors no-underline"
          >
            Home
          </Link>
          <ChevronRight size={16} strokeWidth={2.5} />
          <Link
            href="/research"
            className="text-gray-400 hover:text-[#96EDD6] transition-colors no-underline"
          >
            Research
          </Link>
          <ChevronRight size={16} strokeWidth={2.5} />
          <span className="text-[#96EDD6] font-semibold line-clamp-1">
            {article.title}
          </span>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back()
            } else {
              router.push('/research')
            }
          }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white border border-white/10 rounded-lg hover:bg-[#96EDD6] hover:text-[#101010] hover:border-[#96EDD6] transition-all font-semibold text-sm"
        >
          <ArrowLeft size={16} />
          Back to Research
        </button>

        <article
          className={`relative ${
            article.isPremium
              ? 'border border-[#96EDD6]/60 rounded-2xl bg-[#96EDD6]/[0.03] p-4 md:p-8'
              : ''
          }`}
        >
          {article.isPremium && (
            <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-[#3A7A7A] to-[#96EDD6] text-[#101010] text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
              Premium
            </div>
          )}

          {/* Hero Image */}
          {article.imageUrl && (
            <div className="w-full max-w-[600px] mx-auto aspect-[3/2] mb-8 overflow-hidden rounded-lg bg-[#222]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt={article.title ?? 'Research cover'}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="w-full max-w-[600px] mx-auto">
            {/* Meta */}
            <div className="flex flex-wrap gap-3 md:gap-4 items-center text-sm mb-6">
              {article.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#40e0d0]/10 text-[#40e0d0] border border-[#40e0d0]/30 text-xs font-semibold uppercase tracking-wide">
                  {article.category}
                </span>
              )}
              {formattedFullDate && (
                <time className="text-[#40e0d0] text-sm">
                  {formattedFullDate}
                </time>
              )}
              {article.author && (
                <span className="text-gray-400 text-sm">
                  By {article.author}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8 text-white leading-tight">
              {article.title}
            </h1>

            {/* Summary (if present) */}
            {article.summary && (
              <p className="text-lg text-gray-300 leading-relaxed mb-8 italic border-l-2 border-[#96EDD6] pl-4">
                {article.summary}
              </p>
            )}

            {/* Content section 1 */}
            {bodyOneHtml && (
              <div
                className="markdown-content text-base md:text-lg leading-relaxed text-gray-200"
                dangerouslySetInnerHTML={{ __html: bodyOneHtml }}
              />
            )}

            {/* Second (detail) image between sections */}
            {article.detailImageUrl && (
              <div className="my-6 w-full overflow-hidden rounded-lg bg-[#222]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.detailImageUrl}
                  alt={article.title ?? 'Research detail'}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            {/* Content section 2 */}
            {bodyTwoHtml && (
              <div
                className="markdown-content text-base md:text-lg leading-relaxed text-gray-200"
                dangerouslySetInnerHTML={{ __html: bodyTwoHtml }}
              />
            )}
          </div>
        </article>

        {/* Related Research */}
        {relatedArticles.length > 0 && (
          <section className="mt-12 p-6 md:p-8 rounded-2xl bg-[#0a0a0a] border border-white/10">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-white">
              More Research
            </h2>
            <div className="flex flex-col gap-4">
              {relatedArticles.map((item) => (
                <Link
                  key={item.id}
                  href={`/research/${item.id}`}
                  className="flex flex-col sm:flex-row gap-4 p-3 md:p-4 rounded-xl bg-[#101010] border border-white/5 hover:bg-[#1a1a1a] hover:-translate-y-0.5 transition-all no-underline text-inherit"
                >
                  {item.imageUrl && (
                    <div className="flex-none w-full sm:w-[120px] sm:h-[90px] aspect-[4/3] sm:aspect-auto rounded-lg overflow-hidden bg-[#222]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.title ?? 'Related research'}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-1 text-xs text-gray-400">
                        {item.category && (
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-200">
                            {item.category}
                          </span>
                        )}
                        <span>
                          {formatShortTimestamp(
                            item.createdAt || item.date || item.timestamp
                          )}
                        </span>
                      </div>
                      <h3 className="text-base md:text-[0.95rem] font-semibold text-white leading-snug line-clamp-2 mb-1">
                        {item.title}
                      </h3>
                      {(item.summary || item.description) && (
                        <p className="text-xs md:text-sm text-gray-400 line-clamp-2">
                          {item.summary || item.description}
                        </p>
                      )}
                    </div>
                    <span className="mt-2 text-xs font-semibold text-[#40e0d0] hover:underline self-start">
                      Read More →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
