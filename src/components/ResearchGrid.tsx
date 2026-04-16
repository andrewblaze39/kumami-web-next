'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Loader,
  MessageCircle,
  Send,
  Globe,
  Share2,
} from 'lucide-react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface ResearchArticle {
  id: string
  title: string
  description: string
  category: string
  imageUrl: string
  status?: string
  twitterLink?: string
  discordLink?: string
  telegramLink?: string
  websiteLink?: string
  createdAt: number
}

const DEFAULT_CATEGORIES = [
  'All',
  'Blockchain',
  'DeFi',
  'DePIN',
  'NFT',
  'Games',
  'Memes',
  'Real World Assets',
  'Artificial Intelligence',
  'Exchanges',
  'Web 3 Platform',
  'Gaming Guild',
]

export default function ResearchGrid() {
  const router = useRouter()
  const [articles, setArticles] = useState<ResearchArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All'])
  const [categories, setCategories] = useState<string[]>(['All'])

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const articlesRef = collection(db, 'research_articles')
        const q = query(articlesRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)

        const docs = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Record<string, unknown>
            const createdAtRaw = data.createdAt as
              | { toMillis?: () => number }
              | undefined
            return {
              id: doc.id,
              title: (data.title as string) || 'Untitled Research',
              description: (data.description as string) || '',
              category: (data.category as string) || 'Uncategorized',
              imageUrl:
                (data.imageUrl as string) ||
                'https://kumami.world/og-default.png',
              status: data.status as string | undefined,
              twitterLink: data.twitterLink as string | undefined,
              discordLink: data.discordLink as string | undefined,
              telegramLink: data.telegramLink as string | undefined,
              websiteLink: data.websiteLink as string | undefined,
              createdAt: createdAtRaw?.toMillis
                ? createdAtRaw.toMillis()
                : 0,
            } as ResearchArticle
          })
          .filter((article) => article.status !== 'draft')

        setArticles(docs)

        // Detect categories from fetched articles
        const unique = new Set<string>()
        docs.forEach((a) => {
          if (a.category) unique.add(a.category)
        })
        const detected = Array.from(unique).sort()
        setCategories(
          detected.length > 0 ? ['All', ...detected] : DEFAULT_CATEGORIES
        )
      } catch (error) {
        console.error('Error fetching research articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  const toggleCategory = (category: string) => {
    if (category === 'All') {
      setSelectedCategories(['All'])
      return
    }
    setSelectedCategories((prev) => {
      if (prev.includes('All')) return [category]
      return prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    })
  }

  const filteredArticles = articles.filter((article) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      article.title.toLowerCase().includes(term) ||
      article.description.toLowerCase().includes(term)
    const matchesCategories =
      selectedCategories.includes('All') ||
      selectedCategories.includes(article.category)
    return matchesSearch && matchesCategories
  })

  const colLeft = filteredArticles.filter((_, i) => i % 3 === 0)
  const colCenter = filteredArticles.filter((_, i) => i % 3 === 1)
  const colRight = filteredArticles.filter((_, i) => i % 3 === 2)

  const renderSocialLinks = (article: ResearchArticle) => {
    const stop = (e: React.MouseEvent) => e.stopPropagation()
    const btnClass =
      'flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.12] transition-all hover:bg-[#40e0d0]/[0.18] hover:-translate-y-[1px]'
    const iconClass = 'text-white/90'
    return (
      <div className="flex items-center gap-2">
        {article.twitterLink && (
          <a
            href={article.twitterLink}
            target="_blank"
            rel="noopener noreferrer"
            className={btnClass}
            onClick={stop}
            aria-label="Twitter / X"
          >
            <Share2 size={14} className={iconClass} />
          </a>
        )}
        {article.discordLink && (
          <a
            href={article.discordLink}
            target="_blank"
            rel="noopener noreferrer"
            className={btnClass}
            onClick={stop}
            aria-label="Discord"
          >
            <MessageCircle size={14} className={iconClass} />
          </a>
        )}
        {article.telegramLink && (
          <a
            href={article.telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            className={btnClass}
            onClick={stop}
            aria-label="Telegram"
          >
            <Send size={14} className={iconClass} />
          </a>
        )}
        {article.websiteLink && (
          <a
            href={article.websiteLink}
            target="_blank"
            rel="noopener noreferrer"
            className={btnClass}
            onClick={stop}
            aria-label="Website"
          >
            <Globe size={14} className={iconClass} />
          </a>
        )}
      </div>
    )
  }

  const renderCard = (
    article: ResearchArticle,
    variant: 'default' | 'image-top' = 'default'
  ) => {
    const metaRow = (
      <div className="flex items-center gap-2 text-white/65 text-xs uppercase tracking-wide">
        <span className="inline-flex items-center h-5 px-2.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/75 text-[0.7rem] normal-case tracking-normal">
          {article.category}
        </span>
        <div className="flex-1" />
        {renderSocialLinks(article)}
      </div>
    )

    const title = (
      <h3 className="my-1.5 text-xl font-extrabold text-white">
        {article.title}
      </h3>
    )

    const desc = (
      <p className="m-0 text-white/[0.78] text-[0.9rem] leading-[1.5] line-clamp-3">
        {article.description}
      </p>
    )

    const thumb = (
      <div
        className={`${variant === 'image-top' ? 'mb-3' : 'mt-3'} rounded-[14px] overflow-hidden bg-[#222] aspect-[3/2]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.imageUrl}
          alt={article.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
    )

    return (
      <div
        key={article.id}
        onClick={() => router.push(`/research/${article.id}`)}
        className="cursor-pointer rounded-2xl border border-white/10 bg-[#1a1a1a]/75 backdrop-blur-md overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(0,0,0,0.35)] hover:border-[#40e0d0]/[0.35] p-4"
      >
        {variant === 'image-top' ? (
          <>
            {thumb}
            {metaRow}
            {title}
            {desc}
          </>
        ) : (
          <>
            {metaRow}
            {title}
            {desc}
            {thumb}
          </>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010] text-white pt-28 pb-8 px-5">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-2">
            <h1 className="text-4xl font-bold uppercase tracking-wide m-0">
              Research Portal
            </h1>
          </div>
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-[#40e0d0]" size={40} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#101010] text-white pt-28 pb-8 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-5 relative z-10">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-4xl font-bold uppercase tracking-wide m-0">
            Research Portal
          </h1>
        </div>

        {/* Toolbar: categories + search */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 py-2 border-b border-white/[0.12] mb-4">
          <div className="flex-1 w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex gap-2 flex-wrap justify-center min-w-max px-4 mx-auto">
              {categories.map((category) => {
                const active = selectedCategories.includes(category)
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-4 py-2 rounded-full border text-sm transition-all ${
                      active
                        ? 'bg-[#00c2c7] border-[#00c2c7] text-white'
                        : 'bg-transparent border-[#2a2a2a] text-[#888] hover:bg-[#2a2a2a] hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="relative w-full md:max-w-[320px] md:ml-auto mx-auto">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/55 pointer-events-none"
              size={16}
            />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-full border border-[#2a2a2a] bg-white/[0.04] text-white text-sm outline-none focus:border-[#40e0d0] transition-colors"
            />
          </div>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-8 text-[#888] text-lg">
            No articles found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:1.1fr_1.3fr_1fr] gap-5 items-start">
            {/* Left column */}
            <div className="min-w-0">
              <h2 className="mt-0 mb-4 text-[1.3rem] font-extrabold text-[#40e0d0]">
                Latest Research
              </h2>
              <div className="flex flex-col gap-4">
                {colLeft.map((article) => renderCard(article, 'default'))}
              </div>
            </div>

            {/* Center column */}
            <div className="min-w-0 lg:border-l lg:border-white/[0.12] lg:pl-5">
              <div className="flex flex-col gap-4">
                {colCenter.map((article) => renderCard(article, 'image-top'))}
              </div>
            </div>

            {/* Right column */}
            <div className="min-w-0 md:col-span-2 lg:col-span-1 lg:border-l lg:border-white/[0.12] lg:pl-5 md:border-t md:border-white/[0.12] md:pt-5 lg:border-t-0 lg:pt-0">
              <div className="flex flex-col gap-4">
                {colRight.map((article) => renderCard(article, 'default'))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
