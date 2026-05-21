'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface EducationArticle {
  id: string
  title: string
  level: string
  thumbnail: string
  featured: boolean
  createdAt: number
}

const LEVELS = [
  'All',
  'Level 1',
  'Level 2',
  'Level 3',
  'Level 4',
  'Level 5',
  'Featured Classes',
] as const

export default function EducationGrid() {
  const [selectedLevel, setSelectedLevel] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [educationArticles, setEducationArticles] = useState<EducationArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEducationArticles = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'education_articles'))
        const docs = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Record<string, unknown>
            if (data.status && data.status !== 'published') {
              return null
            }
            const createdAtRaw = data.createdAt as { toMillis?: () => number } | undefined
            return {
              id: doc.id,
              title: (data.title as string) || 'Untitled Lesson',
              level: (data.level as string) || 'Level 1',
              thumbnail:
                (data.thumbnail as string) ||
                'https://via.placeholder.com/300x200?text=Education',
              featured: (data.featured as boolean) || false,
              createdAt: createdAtRaw?.toMillis ? createdAtRaw.toMillis() : 0,
            } as EducationArticle
          })
          .filter((d): d is EducationArticle => d !== null)
        setEducationArticles(docs)
      } catch (error) {
        console.error('Error loading education articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEducationArticles()
  }, [])

  const filteredArticles = educationArticles.filter((article) => {
    const matchesLevel =
      selectedLevel === 'All' ||
      (selectedLevel === 'Featured Classes'
        ? article.featured
        : article.level === selectedLevel)
    const matchesSearch = article.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    return matchesLevel && matchesSearch
  })

  const getLevelNumber = (level: string) => {
    const match = String(level || '').match(/\d+/)
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY
  }

  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (selectedLevel === 'All') {
      const levelDiff = getLevelNumber(a.level) - getLevelNumber(b.level)
      if (levelDiff !== 0) return levelDiff
    }

    const createdDiff = (a.createdAt || 0) - (b.createdAt || 0)
    if (createdDiff !== 0) return createdDiff

    const titleDiff = String(a.title || '').localeCompare(
      String(b.title || ''),
      undefined,
      { sensitivity: 'base' }
    )
    if (titleDiff !== 0) return titleDiff

    return String(a.id || '').localeCompare(String(b.id || ''), undefined, {
      sensitivity: 'base',
    })
  })

  return (
    <div
      className="min-h-screen text-white pt-12 pb-8 px-4 md:px-8 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(175deg, #4E8177 0%, #102425 10%, #102425 70%, #1C4345 85%, #1D5959 100%)',
      }}
    >
      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold uppercase tracking-wide">Courses</h1>
        </div>

        {/* Search Bar */}
        <div className="flex justify-center mb-2">
          <div className="relative w-full max-w-[1280px]">
            <input
              type="text"
              placeholder="What do you want to learn?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 pr-12 py-2 bg-transparent border-2 border-white rounded-[10px] text-white placeholder:text-white placeholder:italic outline-none focus:border-[#96EDD6] focus:bg-[#96EDD6]/5 transition-all"
            />
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white pointer-events-none"
              size={20}
            />
          </div>
        </div>

        {/* Level Tabs */}
        <div className="overflow-x-auto py-4 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:flex lg:justify-center">
          <div
            className="flex gap-1 justify-start lg:justify-center items-center py-2 rounded-full h-12 px-6 min-w-max lg:w-[1280px]"
            style={{
              background: 'linear-gradient(to right, #3A7A7A, #96EDD6)',
            }}
          >
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`flex items-center justify-center flex-shrink-0 lg:flex-1 h-full rounded-full transition-all text-sm font-extrabold px-2 ${
                  selectedLevel === level
                    ? 'bg-[#102425] text-[#96EDD6] font-extrabold'
                    : 'bg-transparent text-[#102425] hover:bg-[#102425]/50'
                }`}
              >
                {level === 'Featured Classes' ? (
                  <span className="text-center leading-tight">
                    FEATURED
                    <br />
                    CLASSES
                  </span>
                ) : (
                  <span className="whitespace-nowrap">{level.toUpperCase()}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Education Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#1a1a1a]/80 border-2 border-[#96EDD6]/20 rounded-lg overflow-hidden animate-pulse">
                <div className="w-full aspect-[3/2] bg-[#2a2a2a]" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-[#2a2a2a] rounded w-3/4" />
                  <div className="h-3 bg-[#2a2a2a] rounded w-1/3" />
                </div>
              </div>
            ))
          ) : filteredArticles.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 text-lg">
              No education articles found matching your criteria.
            </div>
          ) : (
            sortedArticles.map((article) => (
              <Link
                key={article.id}
                href={`/education-article?id=${article.id}`}
                className="bg-[#1a1a1a]/80 border-2 p-2 gap-2 border-[#96EDD6] rounded-lg overflow-hidden cursor-pointer transition-all hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(150,237,214,0.2)] flex flex-col"
                style={{ textDecoration: 'none', color: 'inherit' }}
                draggable={false}
                onClick={(e) => {
                  if (
                    typeof window !== 'undefined' &&
                    window.getSelection()?.toString().length
                  )
                    e.preventDefault()
                }}
              >
                <div className="w-full aspect-[3/2] overflow-hidden bg-[#2a2a2a]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.thumbnail}
                    alt={article.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span
                    className="py-1 px-4 inline-block rounded-md text-[#101010] text-xs font-extrabold tracking-tight uppercase w-fit"
                    style={{
                      background: 'linear-gradient(to right, #3A7A7A, #96EDD6)',
                    }}
                  >
                    {article.level}
                  </span>
                  <h3
                    className="w-full text-base font-semibold text-white m-0 h-12 flex items-center overflow-hidden line-clamp-2 cursor-text"
                    style={{ userSelect: 'text' }}
                  >
                    {article.title}
                  </h3>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
