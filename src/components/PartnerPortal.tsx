'use client'

import { useEffect, useState } from 'react'
import { Search, Loader, Send, Globe } from 'lucide-react'
import { XIcon, DiscordIcon } from '@/components/icons/BrandIcons'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface PartnerArticle {
  id: string
  title: string
  description: string
  imageUrl: string
  category: string
  createdAt: number
  status?: string
  twitterLink?: string
  discordLink?: string
  telegramLink?: string
  websiteLink?: string
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

export default function PartnerPortal() {
  const [articles, setArticles] = useState<PartnerArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'All',
  ])
  const [categories, setCategories] = useState<string[]>(['All'])

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const articlesRef = collection(db, 'partner_articles')
        const q = query(articlesRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)

        const docs = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Record<string, unknown>
            const createdAtRaw = data.createdAt as
              | { toDate?: () => Date }
              | undefined
            return {
              id: doc.id,
              title: (data.title as string) || 'Untitled',
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
              createdAt: createdAtRaw?.toDate
                ? createdAtRaw.toDate().getTime()
                : 0,
            } as PartnerArticle
          })
          .filter((article) => article.status !== 'draft')

        setArticles(docs)

        const unique = new Set<string>()
        docs.forEach((a) => {
          if (a.category) unique.add(a.category)
        })
        const detected = Array.from(unique).sort()
        setCategories(
          detected.length > 0 ? ['All', ...detected] : DEFAULT_CATEGORIES
        )
      } catch (error: unknown) {
        console.error('Error fetching partner articles:', error)
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

  const formatDate = (timestamp: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date
      .toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
      .toUpperCase()
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

  const btnClass =
    'flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.12] transition-all hover:bg-[#40e0d0]/[0.18] hover:-translate-y-[1px]'
  const iconClass = 'text-white/90'

  if (loading) {
    return (
      <div className="min-h-[50vh] bg-[#0a0a0f] text-white py-16 px-5">
        <div className="max-w-[1400px] mx-auto">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-[#40e0d0] mb-8">
            Partner Portal
          </h2>
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-[#40e0d0]" size={40} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0f] text-white py-16 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-5 relative z-10">
        {/* Header */}
        <h2 className="text-center text-3xl md:text-4xl font-bold text-[#40e0d0] mb-8">
          Partner Portal
        </h2>

        {/* Toolbar: categories + search */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 py-2 border-b border-white/[0.12] mb-6">
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
                        ? 'bg-[#96EDD6] border-[#96EDD6] text-[#0a1a1b] font-semibold'
                        : 'bg-transparent border-[#96EDD6]/30 text-[#888] hover:bg-[#2a2a2a] hover:text-white'
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

        {/* Articles */}
        {filteredArticles.length === 0 ? (
          <div className="text-center py-8 text-[#888] text-lg">
            No articles found matching your criteria.
          </div>
        ) : (
          <div className="w-edu-research-grid">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="w-edu-research-card"
                style={{ cursor: 'default' }}
              >
                {/* Image */}
                <div className="w-edu-research-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    loading="lazy"
                    className="w-edu-research-img"
                  />
                </div>

                {/* Content */}
                <div className="w-edu-research-body">
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-edu-research-cat">{article.category}</span>
                    {article.createdAt > 0 && (
                      <span style={{ fontSize: '10.5px', color: 'var(--muted-2)' }}>
                        {formatDate(article.createdAt)}
                      </span>
                    )}
                  </div>

                  <h3 className="w-edu-research-title">{article.title}</h3>
                  <p className="w-edu-research-desc">{article.description}</p>

                  {/* Social links */}
                  <div className="flex items-center gap-2 mt-2">
                    {article.twitterLink && (
                      <a
                        href={article.twitterLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnClass}
                        aria-label="Twitter / X"
                      >
                        <XIcon size={14} className={iconClass} />
                      </a>
                    )}
                    {article.discordLink && (
                      <a
                        href={article.discordLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnClass}
                        aria-label="Discord"
                      >
                        <DiscordIcon size={14} className={iconClass} />
                      </a>
                    )}
                    {article.telegramLink && (
                      <a
                        href={article.telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnClass}
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
                        aria-label="Website"
                      >
                        <Globe size={14} className={iconClass} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
