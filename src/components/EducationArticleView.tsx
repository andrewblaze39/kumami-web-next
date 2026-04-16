'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader } from 'lucide-react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

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
  level?: string
  thumbnail?: string
  imageUrl?: string
  sections?: ArticleSection[]
}

interface ArticleListItem {
  id: string
  level: string
}

interface Props {
  educationId: string
}

export default function EducationArticleView({ educationId }: Props) {
  const [activeSection, setActiveSection] = useState('')
  const [isTocOpen, setIsTocOpen] = useState(false)
  const [article, setArticle] = useState<ArticleDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [articleList, setArticleList] = useState<ArticleListItem[]>([])

  // Fetch article from Firestore
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true)
        setError(null)
        const articleRef = doc(db, 'education_articles', educationId)
        const articleSnap = await getDoc(articleRef)
        if (articleSnap.exists()) {
          setArticle(articleSnap.data() as ArticleDoc)
        } else {
          setError(`Article with ID "${educationId}" not found in database`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Error fetching article:', err)
        setError(`Failed to load article: ${message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [educationId])

  // Fetch list of all article IDs + level (ordered by document ID)
  useEffect(() => {
    const fetchArticleList = async () => {
      try {
        const articlesRef = collection(db, 'education_articles')
        const q = query(articlesRef, orderBy('__name__'))
        const querySnapshot = await getDocs(q)
        const list: ArticleListItem[] = querySnapshot.docs.map((d) => {
          const data = d.data() as Record<string, unknown>
          return {
            id: d.id,
            level: (data?.level as string) || '',
          }
        })
        setArticleList(list)
      } catch (err) {
        console.error('Error fetching article list:', err)
      }
    }

    fetchArticleList()
  }, [])

  // Scroll to top when article ID changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [educationId])

  const displayArticle = article

  const currentLevel = displayArticle?.level || ''

  const parseLevelNumber = (lvl: string) => {
    const m = String(lvl || '').match(/\bLevel\s*(\d+)\b/i)
    return m ? Number(m[1]) : null
  }

  const sortedUniqueLevels = Array.from(
    new Set(articleList.map((a) => a.level).filter(Boolean))
  ).sort((a, b) => {
    const na = parseLevelNumber(a)
    const nb = parseLevelNumber(b)
    if (na != null && nb != null) return na - nb
    if (na != null) return -1
    if (nb != null) return 1
    return String(a).localeCompare(String(b))
  })

  const levelArticles = articleList.filter((a) => a.level === currentLevel)
  const currentIndexInLevel = levelArticles.findIndex((a) => a.id === educationId)
  const prevArticleId =
    currentIndexInLevel > 0 ? levelArticles[currentIndexInLevel - 1].id : null
  const nextArticleId =
    currentIndexInLevel !== -1 && currentIndexInLevel < levelArticles.length - 1
      ? levelArticles[currentIndexInLevel + 1].id
      : null

  const currentLevelIndex = sortedUniqueLevels.indexOf(currentLevel)
  const nextLevel =
    currentLevelIndex !== -1 && currentLevelIndex < sortedUniqueLevels.length - 1
      ? sortedUniqueLevels[currentLevelIndex + 1]
      : null
  const firstArticleNextLevelId = nextLevel
    ? articleList.find((a) => a.level === nextLevel)?.id || null
    : null

  // Intersection Observer to track active section
  useEffect(() => {
    if (!displayArticle?.sections) return

    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    }

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    displayArticle.sections.forEach((_, index) => {
      const element = document.getElementById(`section-${index}`)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [displayArticle])

  const scrollToSection = (sectionIndex: number) => {
    const element = document.getElementById(`section-${sectionIndex}`)
    if (element) {
      const offset = 170
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
    }
  }

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen text-white pt-28 pb-16 font-poppins flex items-center justify-center"
        style={{
          background:
            'linear-gradient(175deg, #4E8177 0%, #102425 10%, #102425 70%, #1C4345 85%, #1D5959 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#96EDD6]" />
          <p className="text-xl text-gray-300">Loading article...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !displayArticle) {
    return (
      <div
        className="min-h-screen text-white pt-28 pb-16 font-poppins flex items-center justify-center"
        style={{
          background:
            'linear-gradient(175deg, #4E8177 0%, #102425 10%, #102425 70%, #1C4345 85%, #1D5959 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <div className="text-6xl">!</div>
          <h2 className="text-2xl font-bold text-[#96EDD6]">
            {error || 'Article not found'}
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Check the browser console for more details
          </p>
          <Link
            href="/education"
            className="mt-4 px-6 py-3 bg-[#96EDD6] text-[#101010] rounded-lg hover:bg-[#96EDD6]/80 transition-all font-semibold no-underline"
          >
            Back to Education Menu
          </Link>
        </div>
      </div>
    )
  }

  const sections = displayArticle.sections || []

  const parseMarkdown = (text: string | undefined) => {
    if (!text) return ''
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
  }

  return (
    <div
      className="min-h-screen text-white pt-10 md:pt-16 lg:pt-20 pb-16 font-poppins"
      style={{
        background:
          'linear-gradient(175deg, #4E8177 0%, #102425 10%, #102425 70%, #1C4345 85%, #1D5959 100%)',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 relative">
        {/* Two Column Layout (sidebar only on large screens) */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          {/* Left Sidebar - Table of Contents (desktop / large screens) */}
          <div className="relative hidden lg:block">
            <div
              className="fixed top-45 w-80 rounded-2xl overflow-hidden"
              style={{ maxWidth: '320px' }}
            >
              <div className="bg-[#1a1a1a]/80 p-6 max-h-[70vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-2 text-[#96EDD6]">
                  {displayArticle.title}
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                  By {displayArticle.author || 'Kumami Team'}
                </p>
                <nav className="space-y-2">
                  {sections.map((section, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToSection(index)}
                      className={`w-full text-left px-4 py-2 rounded-md transition-all text-md font-semibold ${
                        activeSection === `section-${index}`
                          ? 'bg-[#96EDD6] text-[#101010] font-bold'
                          : 'text-gray-300 hover:bg-[#2a2a2a] hover:text-white'
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div>
            {/* Breadcrumb Navigation */}
            <div className="mb-6 flex items-center gap-2 text-base">
              <Link
                href="/"
                className="text-gray-400 hover:text-[#96EDD6] transition-colors no-underline"
              >
                Home
              </Link>
              <ChevronRight size={18} strokeWidth={2.5} />
              <Link
                href="/education"
                className="text-gray-400 hover:text-[#96EDD6] transition-colors no-underline"
              >
                Education
              </Link>
              <ChevronRight size={18} strokeWidth={2.5} />
              <span className="text-[#96EDD6] font-semibold">
                {displayArticle.title}
              </span>
            </div>

            {/* Article Title */}
            <h1 className="text-5xl font-bold mb-8 text-white">
              {displayArticle.title}
            </h1>

            <div>
              {sections.map((section, sectionIndex) => (
                <section
                  key={sectionIndex}
                  id={`section-${sectionIndex}`}
                  className={sectionIndex > 0 ? 'mt-16' : ''}
                >
                  <h2 className="text-3xl font-bold mb-6 text-[#96EDD6]">
                    {section.title}
                  </h2>
                  <div className="flex flex-col gap-6">
                    {section.content.map((item, itemIndex) => {
                      if (item.type === 'paragraph') {
                        return (
                          <div
                            key={itemIndex}
                            className="text-lg leading-relaxed text-gray-200 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: parseMarkdown(item.text),
                            }}
                          />
                        )
                      } else if (item.type === 'image') {
                        return (
                          <div key={itemIndex} className="my-8">
                            <div className="relative w-full aspect-[3/2] bg-[#2a2a2a] rounded-lg border-2 border-[#96EDD6]/30 overflow-hidden">
                              <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                                <div className="animate-pulse flex flex-col items-center gap-2">
                                  <svg
                                    className="w-8 h-8 text-[#96EDD6]/50"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <span className="text-xs text-[#96EDD6]/50">
                                    Loading...
                                  </span>
                                </div>
                              </div>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.src}
                                alt={item.alt || ''}
                                className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300"
                                onLoad={(e) =>
                                  (e.target as HTMLImageElement).classList.remove(
                                    'opacity-0'
                                  )
                                }
                              />
                            </div>
                            {item.caption && (
                              <p className="text-sm text-gray-400 mt-3 text-center italic">
                                {item.caption}
                              </p>
                            )}
                          </div>
                        )
                      } else if (item.type === 'youtube') {
                        return (
                          <div key={itemIndex} className="my-8">
                            <div
                              className="relative w-full"
                              style={{ paddingBottom: '56.25%' }}
                            >
                              <iframe
                                className="absolute top-0 left-0 w-full h-full rounded-lg border-2 border-[#96EDD6]/30"
                                src={`https://www.youtube.com/embed/${item.videoId}`}
                                title={item.title || 'YouTube video player'}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            </div>
                            {item.caption && (
                              <p className="text-sm text-gray-400 mt-3 text-center italic">
                                {item.caption}
                              </p>
                            )}
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                </section>
              ))}

              {/* Navigation Footer */}
              <div className="mt-16 pt-8 border-t-2 border-[#96EDD6]/30 flex justify-between items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {prevArticleId ? (
                    <Link
                      href={`/education-article?id=${prevArticleId}`}
                      className="px-4 py-2 md:px-6 md:py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#96EDD6] hover:text-[#101010] transition-all font-semibold text-sm md:text-base no-underline"
                    >
                      ← Previous Article
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 md:px-6 md:py-3 bg-[#2a2a2a]/50 text-white/50 rounded-lg transition-all font-semibold text-sm md:text-base cursor-not-allowed"
                    >
                      ← Previous Article
                    </button>
                  )}

                  <Link
                    href="/education"
                    className="px-4 py-2 md:px-6 md:py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#96EDD6] hover:text-[#101010] transition-all font-semibold text-sm md:text-base no-underline"
                  >
                    Back to Education Menu
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  {nextArticleId ? (
                    <Link
                      href={`/education-article?id=${nextArticleId}`}
                      className="px-4 py-2 md:px-6 md:py-3 bg-[#96EDD6] text-[#101010] rounded-lg hover:bg-[#96EDD6]/80 transition-all font-semibold text-sm md:text-base no-underline"
                    >
                      Next Article →
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 md:px-6 md:py-3 bg-[#96EDD6]/50 text-[#101010]/50 rounded-lg transition-all font-semibold text-sm md:text-base cursor-not-allowed"
                    >
                      Next Article →
                    </button>
                  )}
                  {firstArticleNextLevelId ? (
                    <Link
                      href={`/education-article?id=${firstArticleNextLevelId}`}
                      className="px-4 py-2 md:px-6 md:py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#96EDD6] hover:text-[#101010] transition-all font-semibold text-sm md:text-base no-underline"
                    >
                      Skip to {nextLevel} →→
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 md:px-6 md:py-3 bg-[#2a2a2a]/50 text-white/50 rounded-lg transition-all font-semibold text-sm md:text-base cursor-not-allowed"
                    >
                      Skip to next level →→
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile TOC Drawer */}
      {isTocOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 lg:hidden"
          onClick={() => setIsTocOpen(false)}
        >
          <div
            className="absolute left-0 h-[calc(100%-8rem)] w-72 max-w-[80%] bg-[#101010] p-4 shadow-xl rounded-r-xl"
            style={{ top: '8rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#96EDD6]">Contents</h2>
              <button
                onClick={() => setIsTocOpen(false)}
                className="text-gray-300 text-sm px-2 py-1 rounded hover:bg-gray-800"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">{displayArticle.title}</p>
            <div className="max-h-[75vh] overflow-y-auto space-y-2">
              {sections.map((section, index) => (
                <button
                  key={index}
                  onClick={() => {
                    scrollToSection(index)
                    setIsTocOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    activeSection === `section-${index}`
                      ? 'bg-[#96EDD6] text-[#101010]'
                      : 'text-gray-200 hover:bg-[#1f2933]'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile left-side navigation tab opener */}
      {sections.length > 0 && (
        <button
          type="button"
          onClick={() => setIsTocOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-[90] h-20 w-4 lg:hidden flex items-center justify-center rounded-r-xl bg-gradient-to-b from-[#3A7A7A]/40 to-[#96EDD6]/40 shadow-sm border border-[#96EDD6]/20"
          aria-label="Open education contents navigation"
        >
          <span className="text-[#f5f5f5] text-[10px] font-semibold">▶</span>
        </button>
      )}
    </div>
  )
}
