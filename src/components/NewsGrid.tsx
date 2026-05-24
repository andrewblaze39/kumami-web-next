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

interface YoutubeShort {
  id: string
  videoId?: string
  title?: string
  isActive?: boolean
  order?: number
}

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

  useEffect(() => {
    loadNews()
    loadReels()
  }, [loadNews, loadReels])

  // Derived lists
  const featuredArticle = news[0]
  const subsequentArticles = news.slice(1, 5)

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
                      className={`flex-1 min-w-0 flex flex-col relative rounded-[10px] overflow-hidden bg-black/50 border border-white/10 no-underline text-inherit transition-transform duration-300 hover:-translate-y-1 ${
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
                      <div className="p-4 flex flex-col flex-1">
                        <h4 className="text-[1.05rem] font-semibold text-white m-0 mb-1 leading-snug line-clamp-3">
                          {item.title}
                        </h4>
                        <span className="block text-xs text-[#888] mt-auto pt-2">
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

          </>
        )}
      </div>
    </div>
  )
}
