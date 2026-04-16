'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Loader } from 'lucide-react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface BlogPost {
  id: string
  title: string
  summary: string
  content: string
  category: string
  thumbnailImageUrl: string
  imageUrl: string
  status: string
  readTime: string
  timestamp: number
}

export default function BlogsGrid() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [categories, setCategories] = useState<string[]>(['All'])

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const blogsRef = collection(db, 'blogs')
        const q = query(blogsRef, orderBy('timestamp', 'desc'))
        const snapshot = await getDocs(q)

        const docs: BlogPost[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Record<string, unknown>
            const timestampRaw = data.timestamp as
              | { toMillis?: () => number; seconds?: number }
              | undefined
            const millis = timestampRaw?.toMillis
              ? timestampRaw.toMillis()
              : timestampRaw?.seconds
                ? timestampRaw.seconds * 1000
                : 0
            return {
              id: docSnap.id,
              title: (data.title as string) || 'Untitled',
              summary: (data.summary as string) || '',
              content: (data.content as string) || '',
              category: (data.category as string) || 'General',
              thumbnailImageUrl: (data.thumbnailImageUrl as string) || '',
              imageUrl: (data.imageUrl as string) || '',
              status: (data.status as string) || '',
              readTime: (data.readTime as string) || '',
              timestamp: millis,
            }
          })
          .filter((post) => post.status === 'published')
          .sort((a, b) => b.timestamp - a.timestamp)

        setPosts(docs)

        // Detect categories from fetched posts
        const unique = new Set<string>()
        docs.forEach((p) => {
          if (p.category) unique.add(p.category)
        })
        const detected = Array.from(unique).sort()
        setCategories(detected.length > 0 ? ['All', ...detected] : ['All'])
      } catch (error) {
        console.error('Error fetching blog posts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  const filteredPosts = posts.filter((post) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      post.title.toLowerCase().includes(term) ||
      post.summary.toLowerCase().includes(term)
    const matchesCategory =
      selectedCategory === 'All' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatDate = (ms: number): string => {
    if (!ms) return ''
    return new Date(ms).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getExcerpt = (post: BlogPost): string => {
    if (post.summary) return post.summary
    if (post.content) return `${post.content.substring(0, 160)}...`
    return 'Blog update from Kumami World.'
  }

  const getImage = (post: BlogPost): string => {
    return post.thumbnailImageUrl || post.imageUrl || '/trendingnews.png'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101010] text-white pt-28 pb-8 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-2">
            <h1 className="text-4xl lg:text-5xl font-bold m-0">Our Journey</h1>
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
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold m-0">Our Journey</h1>
        </div>

        {/* Toolbar: categories + search */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 py-2 border-b border-white/[0.12] mb-6">
          <div className="flex-1 w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex gap-2 flex-wrap justify-center min-w-max px-4 mx-auto">
              {categories.map((category) => {
                const active = selectedCategory === category
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
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
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-full border border-[#2a2a2a] bg-white/[0.04] text-white text-sm outline-none focus:border-[#40e0d0] transition-colors"
            />
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-[#888] text-lg">
            No blog posts found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blogs/${post.id}`}
                className="rounded-3xl overflow-hidden bg-[#101010] border border-white/10 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 no-underline group"
              >
                <div className="relative pb-[60%] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImage(post)}
                    alt={post.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 flex flex-col">
                  {post.category && post.category !== 'General' && (
                    <span className="inline-flex self-start items-center h-5 px-2.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/75 text-[0.7rem] tracking-normal mb-2">
                      {post.category}
                    </span>
                  )}
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                    {getExcerpt(post)}
                  </p>
                  <div className="mt-auto flex items-center justify-between text-xs text-gray-400">
                    <span>{formatDate(post.timestamp)}</span>
                    <span>
                      {post.readTime ? `${post.readTime} min read` : ''}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
