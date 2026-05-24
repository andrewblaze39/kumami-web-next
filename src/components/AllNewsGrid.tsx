'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search, Filter, Loader } from 'lucide-react'
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface NewsArticle {
  id: string
  title: string
  excerpt: string
  summary: string
  category: string
  imageUrl: string
  thumbnailImageUrl: string
  isPremium: boolean
  status: string
  timestamp: number
}

const INITIAL_LOAD = 12
const PAGE_LOAD = 10

function parseTimestamp(
  raw: { toMillis?: () => number; seconds?: number } | undefined
): number {
  if (!raw) return 0
  if (raw.toMillis) return raw.toMillis()
  if (raw.seconds) return raw.seconds * 1000
  return 0
}

function mapDoc(docSnap: QueryDocumentSnapshot<DocumentData>): NewsArticle {
  const data = docSnap.data() as Record<string, unknown>
  return {
    id: docSnap.id,
    title: (data.title as string) || 'Untitled',
    excerpt: (data.excerpt as string) || '',
    summary: (data.summary as string) || '',
    category: (data.category as string) || 'General',
    imageUrl: (data.imageUrl as string) || '',
    thumbnailImageUrl: (data.thumbnailImageUrl as string) || '',
    isPremium: (data.isPremium as boolean) === true,
    status: (data.status as string) || '',
    timestamp: parseTimestamp(
      data.timestamp as
        | { toMillis?: () => number; seconds?: number }
        | undefined
    ),
  }
}

function formatDate(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getImage(article: NewsArticle): string {
  return article.thumbnailImageUrl || article.imageUrl || '/trendingnews.png'
}

function getExcerpt(article: NewsArticle): string {
  return article.excerpt || article.summary || 'News update from Kumami World.'
}

export default function AllNewsGrid() {
  // Paginated news (no filter/search active)
  const [news, setNews] = useState<NewsArticle[]>([])
  // Full dataset loaded when filter/search is active
  const [allNews, setAllNews] = useState<NewsArticle[]>([])
  const [allNewsLoaded, setAllNewsLoaded] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const lastCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)

  const [categories, setCategories] = useState<string[]>(['All', 'Premium'])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All'])

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Whether we are in filter/search mode (use allNews) vs paginated mode (use news)
  const isFiltering =
    !selectedCategories.includes('All') || searchQuery.trim().length > 0

  // ─── Initial load & category detection ───────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)

        // Detect categories from entire collection (lightweight — fields only)
        const catSnap = await getDocs(collection(db, 'news'))
        const unique = new Set<string>()
        let hasPremium = false
        catSnap.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>
          if (data.category) unique.add(data.category as string)
          if (data.isPremium === true) hasPremium = true
        })
        const sorted = Array.from(unique).sort()
        setCategories(['All', ...(hasPremium ? ['Premium'] : []), ...sorted])

        // Initial paginated load
        const q = query(
          collection(db, 'news'),
          orderBy('timestamp', 'desc'),
          limit(INITIAL_LOAD)
        )
        const snap = await getDocs(q)
        const docs = snap.docs
          .map(mapDoc)
          .filter((a) => a.status !== 'draft')
        setNews(docs)
        lastCursorRef.current = snap.docs[snap.docs.length - 1] ?? null
        setHasMore(snap.docs.length >= INITIAL_LOAD)
      } catch (err) {
        console.error('Error initialising AllNewsGrid:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // ─── Load full dataset when filter/search is activated ───────────────────
  const loadAllNews = useCallback(async () => {
    if (allNewsLoaded) return
    try {
      setLoading(true)
      const q = query(collection(db, 'news'), orderBy('timestamp', 'desc'))
      const snap = await getDocs(q)
      const docs = snap.docs
        .map(mapDoc)
        .filter((a) => a.status !== 'draft')
      setAllNews(docs)
      setAllNewsLoaded(true)
    } catch (err) {
      console.error('Error loading all news:', err)
    } finally {
      setLoading(false)
    }
  }, [allNewsLoaded])

  // ─── Trigger full load when entering filter/search mode ──────────────────
  useEffect(() => {
    if (isFiltering && !allNewsLoaded) {
      loadAllNews()
    }
  }, [isFiltering, allNewsLoaded, loadAllNews])

  // ─── Paginate (load more) ─────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || isFiltering || loadingMore || !lastCursorRef.current) return
    try {
      setLoadingMore(true)
      const q = query(
        collection(db, 'news'),
        orderBy('timestamp', 'desc'),
        startAfter(lastCursorRef.current),
        limit(PAGE_LOAD)
      )
      const snap = await getDocs(q)
      const docs = snap.docs
        .map(mapDoc)
        .filter((a) => a.status !== 'draft')
      setNews((prev) => [...prev, ...docs])
      lastCursorRef.current = snap.docs[snap.docs.length - 1] ?? null
      setHasMore(snap.docs.length >= PAGE_LOAD)
    } catch (err) {
      console.error('Error loading more news:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, isFiltering, loadingMore])

  // ─── IntersectionObserver for infinite scroll sentinel ───────────────────
  const observerRef = useRef<IntersectionObserver | null>(null)
  const lastCardRef = useCallback(
    (node: HTMLAnchorElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMore()
          }
        },
        { threshold: 0.1 }
      )
      if (node) observerRef.current.observe(node)
    },
    [loadMore]
  )

  // ─── Category toggle ──────────────────────────────────────────────────────
  const toggleCategory = useCallback((category: string) => {
    if (category === 'All') {
      setSelectedCategories(['All'])
      return
    }
    setSelectedCategories((prev) => {
      const withoutAll = prev.filter((c) => c !== 'All')
      const next = withoutAll.includes(category)
        ? withoutAll.filter((c) => c !== category)
        : [...withoutAll, category]
      return next.length === 0 ? ['All'] : next
    })
  }, [])

  // ─── Derived filtered list ────────────────────────────────────────────────
  const dataSource = isFiltering ? allNews : news

  const categoryFiltered = selectedCategories.includes('All')
    ? dataSource
    : dataSource.filter((item) => {
        const premiumSelected = selectedCategories.includes('Premium')
        const catFilters = selectedCategories.filter((c) => c !== 'Premium')

        if (premiumSelected && catFilters.length === 0) {
          return item.isPremium === true
        }
        if (premiumSelected && catFilters.length > 0) {
          return item.isPremium === true && catFilters.includes(item.category)
        }
        return catFilters.includes(item.category)
      })

  const trimmedSearch = searchQuery.trim().toLowerCase()
  const displayedArticles =
    trimmedSearch.length === 0
      ? categoryFiltered
      : categoryFiltered.filter((item) => {
          const haystack = [item.title, item.excerpt, item.summary, item.category]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(trimmedSearch)
        })

  // ─── Initial loading screen ───────────────────────────────────────────────
  if (loading && news.length === 0 && allNews.length === 0) {
    return (
      <div className="min-h-screen bg-[#101010] text-white pt-28 pb-8 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-[#40e0d0]" size={40} />
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#101010] text-white pt-28 pb-8 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 relative z-10">

        {/* Compact toolbar row */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <h1 className="text-3xl lg:text-4xl font-bold m-0">All News</h1>

          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Toggle filters"
              className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
                showFilters
                  ? 'bg-[#00c2c7] border-[#00c2c7] text-white'
                  : 'bg-transparent border-[#2a2a2a] text-[#888] hover:bg-[#2a2a2a] hover:text-white'
              }`}
            >
              <Filter size={16} />
            </button>

            {/* Search toggle */}
            <button
              onClick={() => setShowSearch((v) => !v)}
              aria-label="Toggle search"
              className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
                showSearch
                  ? 'bg-[#00c2c7] border-[#00c2c7] text-white'
                  : 'bg-transparent border-[#2a2a2a] text-[#888] hover:bg-[#2a2a2a] hover:text-white'
              }`}
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* Expandable search bar */}
        {showSearch && (
          <div className="mb-3">
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/55 pointer-events-none"
                size={16}
              />
              <input
                type="search"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full h-10 pl-9 pr-4 rounded-full border border-[#2a2a2a] bg-white/[0.04] text-white text-sm outline-none focus:border-[#40e0d0] transition-colors"
              />
            </div>
          </div>
        )}

        {/* Expandable filter capsules */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/[0.12]">
            {categories.map((category) => {
              const active = selectedCategories.includes(category)
              const isPremiumCat = category === 'Premium'
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-4 py-1.5 rounded-full border text-sm transition-all ${
                    active && isPremiumCat
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : active
                      ? 'bg-[#00c2c7] border-[#00c2c7] text-white'
                      : isPremiumCat
                      ? 'bg-transparent border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                      : 'bg-transparent border-[#2a2a2a] text-[#888] hover:bg-[#2a2a2a] hover:text-white'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
        )}

        {/* Loading overlay when fetching all news */}
        {loading && isFiltering && (
          <div className="flex items-center justify-center py-10">
            <Loader className="animate-spin text-[#40e0d0]" size={32} />
          </div>
        )}

        {/* Grid */}
        {!loading && displayedArticles.length === 0 ? (
          <div className="text-center py-12 text-[#888] text-lg">
            No news articles found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedArticles.map((article, index) => {
              const isLast =
                index === displayedArticles.length - 1 && !isFiltering && trimmedSearch.length === 0
              return (
                <Link
                  key={article.id}
                  href={`/news/${article.id}`}
                  ref={isLast ? lastCardRef : null}
                  className="flex flex-col rounded-3xl overflow-hidden bg-[#1a1a1a] border border-white/10 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 no-underline group relative"
                >
                  {article.isPremium && (
                    <div className="absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-semibold tracking-wide">
                      Premium
                    </div>
                  )}
                  <div className="relative pb-[60%] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImage(article)}
                      alt={article.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    {article.category && (
                      <span className="inline-flex self-start items-center h-5 px-2.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/75 text-[0.7rem] tracking-normal mb-2">
                        {article.category}
                      </span>
                    )}
                    <h3 className="text-base md:text-lg font-semibold text-white mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                      {getExcerpt(article)}
                    </p>
                    <div className="mt-auto flex items-center justify-between text-xs text-gray-400">
                      <span>{formatDate(article.timestamp)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination feedback */}
        {loadingMore && (
          <div className="flex items-center justify-center gap-2 py-8 text-[#888] text-sm">
            <Loader className="animate-spin text-[#40e0d0]" size={20} />
            <span>Loading more news...</span>
          </div>
        )}
        {!isFiltering && !hasMore && news.length > 0 && (
          <div className="text-center py-8 text-[#555] text-sm">
            No more news to load
          </div>
        )}

      </div>
    </div>
  )
}
