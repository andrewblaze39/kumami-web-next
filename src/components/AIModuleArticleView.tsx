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

interface ContentBlock {
  type: 'paragraph' | 'image' | 'youtube'
  text?: string
  src?: string
  alt?: string
  caption?: string
  videoId?: string
  title?: string
}

interface Section {
  title: string
  content: string | ContentBlock[]
}

interface AIModule {
  title: string
  description?: string
  level?: string
  author?: string
  thumbnail?: string
  featured?: boolean
  status?: string
  sections?: Section[]
}

interface ArticleListItem {
  id: string
  status?: string
}

interface Props {
  moduleId: string
}

export default function AIModuleArticleView({ moduleId }: Props) {
  const [activeSection, setActiveSection] = useState('')
  const [isTocOpen, setIsTocOpen] = useState(false)
  const [article, setArticle] = useState<AIModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [articleList, setArticleList] = useState<string[]>([])

  // Fetch article from Firestore
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true)
        setError(null)
        const articleRef = doc(db, 'ai_modules', moduleId)
        const articleSnap = await getDoc(articleRef)
        if (articleSnap.exists()) {
          setArticle(articleSnap.data() as AIModule)
        } else {
          setError(`Module with ID "${moduleId}" not found in database`)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('Error fetching module:', err)
        setError(`Failed to load module: ${message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [moduleId])

  // Fetch list of all module IDs (ordered by document ID), filtering out drafts
  useEffect(() => {
    const fetchArticleList = async () => {
      try {
        const articlesRef = collection(db, 'ai_modules')
        const q = query(articlesRef, orderBy('__name__'))
        const querySnapshot = await getDocs(q)
        const list: string[] = []
        querySnapshot.docs.forEach((d) => {
          const data = d.data() as ArticleListItem
          if (data.status !== 'draft') {
            list.push(d.id)
          }
        })
        setArticleList(list)
      } catch (err: unknown) {
        console.error('Error fetching module list:', err)
      }
    }

    fetchArticleList()
  }, [])

  // Scroll to top when module ID changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [moduleId])

  const displayArticle = article

  const currentIndex = articleList.indexOf(moduleId)
  const prevArticleId =
    currentIndex > 0 ? articleList[currentIndex - 1] : null
  const nextArticleId =
    currentIndex !== -1 && currentIndex < articleList.length - 1
      ? articleList[currentIndex + 1]
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

  // Render section content — handles both string (legacy) and ContentBlock[] (new)
  const renderSectionContent = (content: string | ContentBlock[]) => {
    if (typeof content === 'string') {
      return (
        <div className="text-gray-300 mt-2 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-6 mt-2">
        {content.map((block, blockIndex) => {
          if (block.type === 'paragraph') {
            return (
              <div
                key={blockIndex}
                className="text-gray-300 leading-relaxed whitespace-pre-line"
              >
                {block.text}
              </div>
            )
          }

          if (block.type === 'image') {
            return (
              <div key={blockIndex} className="my-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.src}
                  alt={block.alt || ''}
                  loading="lazy"
                  className="w-full rounded-lg border border-white/10"
                  style={{ height: 'auto' }}
                />
                {block.caption && (
                  <p className="text-sm text-gray-400 mt-2 text-center italic">
                    {block.caption}
                  </p>
                )}
              </div>
            )
          }

          if (block.type === 'youtube') {
            return (
              <div key={blockIndex} className="my-4">
                <div
                  className="relative w-full"
                  style={{ paddingBottom: '56.25%' }}
                >
                  <iframe
                    className="absolute top-0 left-0 w-full h-full rounded-lg border border-white/10"
                    src={`https://www.youtube.com/embed/${block.videoId}`}
                    title={block.title || 'YouTube video player'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                {block.caption && (
                  <p className="text-sm text-gray-400 mt-2 text-center italic">
                    {block.caption}
                  </p>
                )}
              </div>
            )
          }

          return null
        })}
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] text-white flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader className="animate-spin" />
          <span>Loading module...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !displayArticle) {
    return (
      <div className="min-h-screen bg-[#050608] text-white flex items-center justify-center px-4">
        <div className="max-w-xl w-full rounded-xl bg-[#16171b] border border-white/10 p-5">
          <div className="text-[#40e0d0] font-bold text-lg">
            Module not available
          </div>
          <div className="text-gray-300 mt-2">
            {error || 'Module not found'}
          </div>
          <Link
            href="/ai-labs/module"
            className="mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 bg-[#22242a] hover:bg-[#1f2025] transition-colors duration-150 text-[#40e0d0] font-semibold no-underline"
          >
            Back to AI Modules
          </Link>
        </div>
      </div>
    )
  }

  const sections = displayArticle.sections || []

  return (
    <div className="min-h-screen bg-[#050608] text-white px-4 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
          <Link href="/ai-labs" className="hover:text-white no-underline">
            AI Labs
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/ai-labs/module" className="hover:text-white no-underline">
            Modules
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">
            {displayArticle.title || 'Module'}
          </span>
        </div>

        {/* Two-column layout: TOC sidebar + content */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar TOC */}
          <div className="rounded-xl bg-[#16171b] border border-white/10 p-4 h-fit">
            <div className="flex items-center justify-between">
              <div className="font-bold text-[#40e0d0]">Table of Contents</div>
              <button
                type="button"
                onClick={() => setIsTocOpen((v) => !v)}
                className="lg:hidden text-gray-300 hover:text-white"
              >
                {isTocOpen ? 'Hide' : 'Show'}
              </button>
            </div>

            <div
              className={`mt-3 space-y-2 ${isTocOpen ? 'block' : 'hidden'} lg:block`}
            >
              {sections.map((section, index) => (
                <a
                  key={index}
                  href={`#section-${index}`}
                  onClick={() => setIsTocOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors no-underline ${
                    activeSection === `section-${index}`
                      ? 'bg-[#22242a] text-[#40e0d0]'
                      : 'text-gray-300 hover:bg-[#1f2025] hover:text-white'
                  }`}
                >
                  {section.title || `Section ${index + 1}`}
                </a>
              ))}
            </div>
          </div>

          {/* Main content panel */}
          <div className="rounded-xl bg-[#16171b] border border-white/10 p-5">
            <h1 className="text-2xl md:text-3xl font-bold text-[#40e0d0]">
              {displayArticle.title || 'AI Module'}
            </h1>
            {displayArticle.description && (
              <p className="text-gray-300 mt-3 leading-relaxed">
                {displayArticle.description}
              </p>
            )}

            <div className="mt-6 space-y-8">
              {sections.map((section, index) => (
                <div key={index} id={`section-${index}`}>
                  <h2 className="text-xl font-semibold text-white">
                    {section.title || `Section ${index + 1}`}
                  </h2>
                  {section.content
                    ? renderSectionContent(section.content)
                    : null}
                </div>
              ))}
            </div>

            {/* Prev / Next navigation */}
            <div className="mt-10 flex items-center justify-between">
              {prevArticleId ? (
                <Link
                  href={`/ai-labs/module/${prevArticleId}`}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-[#22242a] hover:bg-[#1f2025] transition-colors duration-150 text-white font-semibold no-underline"
                >
                  Previous
                </Link>
              ) : (
                <span />
              )}

              {nextArticleId ? (
                <Link
                  href={`/ai-labs/module/${nextArticleId}`}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-[#22242a] hover:bg-[#1f2025] transition-colors duration-150 text-white font-semibold no-underline"
                >
                  Next
                </Link>
              ) : (
                <span />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
