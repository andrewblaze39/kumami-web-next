'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader, ArrowRight } from 'lucide-react'
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ---------- Types ----------

interface FirestoreTimestampLike {
  seconds?: number
  nanoseconds?: number
  toDate?: () => Date
  toMillis?: () => number
}

interface NewsArticle {
  id: string
  title?: string
  excerpt?: string
  summary?: string
  category?: string
  imageUrl?: string
  isPremium?: boolean
  status?: string
  timestamp?: FirestoreTimestampLike
}

interface EducationModule {
  id: string
  title: string
  level: string
  levelNum: number
  thumbnail: string
  featured: boolean
  createdAt: number
}

interface YoutubeShort {
  id: string
  videoId?: string
  title?: string
  isActive?: boolean
  order?: number
}

type CategoryMap = Record<string, NewsArticle[]>

// ---------- Date formatting (ported from CRA dateUtils) ----------

function coerceToDate(timestamp: FirestoreTimestampLike | undefined): Date | null {
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

function formatNewsPortalTimestamp(
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

// ---------- Component ----------

export default function NewsGrid() {
  const router = useRouter()
  const [news, setNews] = useState<NewsArticle[]>([])
  const [reels, setReels] = useState<YoutubeShort[]>([])
  const [educationModules, setEducationModules] = useState<EducationModule[]>([])
  const [categoryNews, setCategoryNews] = useState<CategoryMap>({
    News: [],
    Crypto: [],
    Market: [],
  })
  const [loading, setLoading] = useState(true)

  // Latest news (top 15)
  const loadNews = useCallback(async () => {
    try {
      setLoading(true)
      const q = query(
        collection(db, 'news'),
        orderBy('timestamp', 'desc'),
        limit(15)
      )
      const snapshot = await getDocs(q)
      const fetched: NewsArticle[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<NewsArticle, 'id'>),
      }))
      const published = fetched
        .filter((article) => article.status !== 'draft')
        .sort((a, b) => {
          const dateA = a.timestamp?.seconds ?? 0
          const dateB = b.timestamp?.seconds ?? 0
          return dateB - dateA
        })
      setNews(published)
    } catch (error) {
      console.error('Error fetching news:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // YouTube Shorts
  const loadReels = useCallback(async () => {
    try {
      const q = query(collection(db, 'youtube_shorts'), limit(50))
      const snapshot = await getDocs(q)
      const shorts: YoutubeShort[] = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<YoutubeShort, 'id'>) }))
        .filter((s) => s.isActive !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      setReels(shorts)
    } catch (error) {
      console.error('Error fetching shorts:', error)
      setReels([])
    }
  }, [])

  // Education modules (top 4, lowest levels first)
  const loadEducation = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, 'education_articles'))
      const docs = snapshot.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>
          if (data.status && data.status !== 'published') return null
          const levelStr = (data.level as string) || 'Level 1'
          const levelNumMatch = levelStr.match(/\d+/)
          const createdAtRaw = data.createdAt as FirestoreTimestampLike | undefined
          return {
            id: d.id,
            title: (data.title as string) || 'Untitled Lesson',
            level: levelStr,
            levelNum: levelNumMatch ? parseInt(levelNumMatch[0], 10) : 1,
            thumbnail:
              (data.thumbnail as string) ||
              'https://via.placeholder.com/300x200?text=Education',
            featured: (data.featured as boolean) || false,
            createdAt: createdAtRaw?.toMillis ? createdAtRaw.toMillis() : 0,
          } as EducationModule
        })
        .filter((d): d is EducationModule => d !== null)
        .sort((a, b) => a.levelNum - b.levelNum)
        .slice(0, 4)
      setEducationModules(docs)
    } catch (error) {
      console.error('Error loading education articles:', error)
    }
  }, [])

  // Category news (News, Crypto, Market)
  const loadCategoryNews = useCallback(async () => {
    try {
      const categories = ['News', 'Crypto', 'Market']
      const data: CategoryMap = { News: [], Crypto: [], Market: [] }

      await Promise.all(
        categories.map(async (cat) => {
          try {
            const q = query(
              collection(db, 'news'),
              where('category', '==', cat),
              orderBy('timestamp', 'desc'),
              limit(10)
            )
            const snapshot = await getDocs(q)
            const articles: NewsArticle[] = snapshot.docs
              .map((d) => ({
                id: d.id,
                ...(d.data() as Omit<NewsArticle, 'id'>),
              }))
              .filter((a) => a.status !== 'draft')
            data[cat] = articles
          } catch (err) {
            // A composite index may be missing for one category — degrade gracefully
            console.error(`Error loading ${cat} news:`, err)
            data[cat] = []
          }
        })
      )
      setCategoryNews(data)
    } catch (error) {
      console.error('Error loading category news:', error)
    }
  }, [])

  useEffect(() => {
    loadNews()
    loadReels()
    loadEducation()
    loadCategoryNews()
  }, [loadNews, loadReels, loadEducation, loadCategoryNews])

  // Derived lists
  const featuredArticle = news[0]
  const subsequentArticles = news.slice(1, 5)
  const excludedArticleIds = new Set(
    [featuredArticle?.id, ...subsequentArticles.map((a) => a.id)].filter(
      (id): id is string => Boolean(id)
    )
  )
  const getFilteredCategoryArticles = (articles: NewsArticle[]) =>
    articles.filter((a) => !excludedArticleIds.has(a.id)).slice(0, 3)

  return (
    <div className="min-h-screen bg-[#101010] text-white py-8">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {loading && news.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader className="animate-spin mr-3" size={20} />
            <span>Loading news...</span>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            No news available
          </div>
        ) : (
          <>
            {/* SECTION 1: Featured Latest News */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 pl-2">
                Latest News
              </h2>
              {featuredArticle && (
                <Link
                  href={`/news/${featuredArticle.id}`}
                  className={`relative flex flex-col md:flex-row rounded-xl overflow-hidden bg-black/50 border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] no-underline text-inherit ${
                    featuredArticle.isPremium ? 'border-[#96EDD6]/60' : ''
                  }`}
                >
                  {featuredArticle.isPremium && (
                    <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-[#3A7A7A] to-[#96EDD6] text-[#101010] text-xs font-bold uppercase tracking-wide px-2 py-1 rounded">
                      Premium
                    </div>
                  )}
                  <div className="flex-1 p-6 flex flex-col justify-start order-2 md:order-1">
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                      {featuredArticle.title}
                    </h3>
                    {(featuredArticle.excerpt || featuredArticle.summary) && (
                      <p className="text-[#aaa] text-base leading-relaxed m-0 line-clamp-2">
                        {featuredArticle.excerpt || featuredArticle.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-auto pt-4">
                      <span className="text-xs uppercase tracking-wide text-white/65">
                        {formatNewsPortalTimestamp(featuredArticle.timestamp)}
                      </span>
                      {featuredArticle.category && (
                        <span className="ml-auto inline-flex items-center h-5 px-2.5 rounded-full bg-white/10 border border-white/10 text-white/75 text-xs">
                          {featuredArticle.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-none w-full md:w-1/2 md:max-w-[500px] aspect-[3/2] overflow-hidden order-1 md:order-2 bg-[#222]">
                    {featuredArticle.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featuredArticle.imageUrl}
                        alt={featuredArticle.title ?? 'Featured article'}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                      />
                    )}
                  </div>
                </Link>
              )}
            </section>

            {/* SECTION 2: Subsequent Latest News Horizontal List */}
            {subsequentArticles.length > 0 && (
              <section className="mb-8">
                <div className="flex flex-col md:flex-row gap-4 py-2 md:justify-between">
                  {subsequentArticles.map((item) => (
                    <Link
                      key={item.id}
                      href={`/news/${item.id}`}
                      className={`flex-1 min-w-0 block relative rounded-[10px] overflow-hidden bg-black/50 border border-white/10 no-underline text-inherit transition-transform duration-300 hover:-translate-y-1 ${
                        item.isPremium ? 'border-[#96EDD6]/60' : ''
                      }`}
                    >
                      {item.isPremium && (
                        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-[#3A7A7A] to-[#96EDD6] text-[#101010] text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded">
                          Premium
                        </div>
                      )}
                      <div className="w-full aspect-[3/2] overflow-hidden relative bg-[#222]">
                        {item.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.title ?? 'News article'}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="text-[1.05rem] font-semibold text-white m-0 mb-1 leading-snug line-clamp-3">
                          {item.title}
                        </h4>
                        <span className="block text-xs text-[#888] mt-1">
                          {formatNewsPortalTimestamp(item.timestamp)}
                        </span>
                      </div>
                    </Link>
                  ))}

                  {/* More Button */}
                  <button
                    type="button"
                    onClick={() => router.push('/all-news')}
                    className="self-center flex-none w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-full border-2 border-[#3A7A7A] text-[#96EDD6] cursor-pointer transition-all duration-300 hover:scale-110 hover:border-[#96EDD6] hover:text-white hover:shadow-[0_4px_20px_rgba(150,237,214,0.3)]"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(58,122,122,0.2), rgba(150,237,214,0.1))',
                    }}
                    aria-label="See more news"
                  >
                    <ArrowRight size={22} />
                    <span className="text-[0.7rem] font-bold uppercase tracking-widest">
                      More
                    </span>
                  </button>
                </div>
              </section>
            )}

            {/* SECTION 3: Shorts */}
            {reels.length > 0 && (
              <section className="mb-8 py-6 border-t border-b border-white/10">
                <h2 className="text-2xl font-bold text-white mb-4 pl-2">
                  Shorts
                </h2>
                <div className="flex gap-4 overflow-x-auto py-2 px-1 snap-x snap-mandatory [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-[3px]">
                  {reels.map((short) => (
                    <div
                      key={short.id}
                      className="flex-none w-[200px] aspect-[9/16] overflow-hidden rounded-xl bg-black snap-start"
                    >
                      {short.videoId && (
                        <iframe
                          src={`https://www.youtube.com/embed/${short.videoId}?rel=0&modestbranding=1`}
                          title={short.title || 'YouTube Shorts'}
                          className="w-full h-full border-0 rounded-xl"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 4: Education & Category News Two-Column */}
            <section className="mt-8 pt-6 border-t border-white/10">
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
                {/* Left column: Education */}
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-white mb-4 pl-2">
                    Education
                  </h2>
                  <div className="flex flex-col gap-4">
                    {educationModules.map((module) => (
                      <Link
                        key={module.id}
                        href={`/education-article?id=${module.id}`}
                        className="flex flex-col sm:flex-row bg-[#1a1a1a]/75 border border-white/10 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] no-underline text-inherit"
                      >
                        <div className="flex-none sm:w-[120px] sm:h-[90px] aspect-[3/2] sm:aspect-auto overflow-hidden bg-[#222]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={module.thumbnail}
                            alt={module.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[#101010] text-[0.65rem] font-bold uppercase mb-2 w-fit"
                            style={{
                              background:
                                'linear-gradient(to right, #3A7A7A, #96EDD6)',
                            }}
                          >
                            {module.level}
                          </span>
                          <h3 className="text-sm font-semibold text-white m-0 leading-snug line-clamp-2">
                            {module.title}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Right column: Category news */}
                <div className="min-w-0 flex flex-col gap-6 lg:border-l lg:border-white/10 lg:pl-8">
                  {Object.entries(categoryNews).map(
                    ([category, articles]) =>
                      articles.length > 0 && (
                        <div
                          key={category}
                          className="bg-[#1a1a1a]/50 border border-white/10 rounded-xl p-4"
                        >
                          <h3 className="text-[1.1rem] font-bold text-[#40e0d0] uppercase tracking-wide m-0 mb-3">
                            {category}
                          </h3>
                          <div className="flex flex-col gap-3">
                            {getFilteredCategoryArticles(articles).map(
                              (article) => (
                                <Link
                                  key={article.id}
                                  href={`/news/${article.id}`}
                                  className="flex gap-3 py-2 border-b border-white/5 last:border-b-0 items-center no-underline text-inherit transition-colors hover:bg-white/[0.03] rounded-md"
                                >
                                  {article.imageUrl && (
                                    <div className="flex-none w-[60px] h-[45px] rounded-md overflow-hidden">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={article.imageUrl}
                                        alt={article.title ?? 'News article'}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <span className="text-[0.85rem] font-medium text-white leading-snug line-clamp-2">
                                      {article.title}
                                    </span>
                                    <span className="text-[0.7rem] text-[#888]">
                                      {formatNewsPortalTimestamp(
                                        article.timestamp
                                      )}
                                    </span>
                                  </div>
                                </Link>
                              )
                            )}
                          </div>
                        </div>
                      )
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
