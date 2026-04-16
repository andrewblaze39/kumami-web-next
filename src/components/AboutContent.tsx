'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore'
import { ChevronLeft, ChevronRight, Loader, X } from 'lucide-react'
import { db } from '@/lib/firebase'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ProductKey =
  | 'News Portal'
  | 'Education'
  | 'Games'
  | 'Gaming Guild'
  | 'AI Labs'
  | 'Staking'

interface PriceDetails {
  label: string
  value: string
  unit: string
  features: string[]
  button: string
}

interface ProductInfo {
  title: string
  description: string
  price?: PriceDetails
}

interface FirestoreTimestamp {
  seconds?: number
  toMillis?: () => number
}

interface TrendingNewsItem {
  id: string
  title?: string
  summary?: string
  description?: string
  imageUrl?: string
  image?: string
  thumbnail?: string
  category?: string
  status?: string
  timestamp?: FirestoreTimestamp
}

interface TrendingGameItem {
  id: string
  title?: string
  name?: string
  description?: string
  thumbnail?: string
  image?: string
  imageUrl?: string
  category?: string
  status?: string
  timestamp?: FirestoreTimestamp
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  'kumami-dev.firebasestorage.app'

const makeCommunityUrl = (filename: string): string =>
  `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/community-events%2F${filename}?alt=media`

const COLLAGE_IMAGES = Array.from({ length: 12 }, (_, i) =>
  makeCommunityUrl(`community-${String(i + 1).padStart(2, '0')}.jpg`)
)

const GRID_AREAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']

const DEFAULT_ABOUT_INTRO =
  "Founded in 2025, Kumami was built with a vision to make Web3 accessible to everyone by combining cryptocurrency education, gaming, AI research, and real-time news into one seamless ecosystem. With our simple and intuitive UI/UX, we make onboarding into the decentralized world easier, empowering users to learn, explore, and earn while connecting with a vibrant global community.\n\nAt Kumami, we're not just building a platform—we're shaping the future of how people experience Web3. We believe in lowering barriers so anyone, regardless of background, can participate in the next wave of digital innovation. Together, we're creating an ecosystem that inspires growth, collaboration, and meaningful impact."

const PRODUCT_CONTENT: Record<ProductKey, ProductInfo> = {
  'News Portal': {
    title: 'News Portal',
    description:
      "At Kumami World News Portal, we believe information should move as fast as the world does. Our platform delivers real-time news with accuracy and speed, covering everything from global headlines to the latest in Web3, finance, technology, and others. Whether you're a casual reader or a trend-chaser, Kumami brings you a diverse range of stories and updates—curated for relevance, clarity, and impact.\n\nFor those who want deeper insights, Kumami Pro offers exclusive access to market analysis, expert opinions, and trend forecasting across key industries. From crypto and stocks to emerging tech, our analysts break down the noise to give you the edge. With Kumami, you don't just stay informed—you stay ahead. Join us and explore the world through a smarter, sharper news experience.",
    price: {
      label: 'From',
      value: '$19.99',
      unit: '/month',
      features: [
        'Alpha Room & Airdrop Radar',
        'Alerts on Major Market Moves',
        'AI Portfolio Manager',
        'Deep Market Analysis',
        'Airdrop & Whitelist list',
        'Live Q&A with Project Partners',
      ],
      button: 'Get Kumami Pro',
    },
  },
  Education: {
    title: 'Education',
    description:
      'Kumami Education is a comprehensive platform designed to empower users of all backgrounds to master cryptocurrency, blockchain, and Web3 technologies. Our interactive courses, expert-led webinars, and vibrant discussion forums provide a supportive environment for learning, sharing insights, and earning industry-recognized certificates. Whether you are a beginner or an advanced enthusiast, Kumami Education helps you stay ahead in the rapidly evolving digital economy.',
  },
  Games: {
    title: 'Games',
    description:
      "Explore our Web3 Games Hub, your go-to destination to discover and play a wide variety of blockchain-based games across multiple genres and blockchains. From action-packed RPGs to strategic simulations and many more!\n\nEasily search for games by category, blockchain, or unique features like NFTs and decentralized mechanics. Whether you're here to have fun, earn rewards, or engage with a vibrant community, our platform offers seamless access to the best Web3 games, constantly updated to bring you fresh experiences.\n\nStay informed with the latest updates, reviews, and game launches, and dive into the future of gaming today!",
  },
  'Gaming Guild': {
    title: 'Gaming Guild',
    description:
      'The Kumami Gaming Guild is a thriving community for Web3 gamers, offering access to exclusive tournaments, collaborative events, and member-only rewards. Connect with fellow enthusiasts, participate in strategy sessions, and gain entry to special gaming leagues. Our guild fosters teamwork, innovation, and growth, making it the ultimate hub for anyone passionate about blockchain gaming and digital competition.',
  },
  'AI Labs': {
    title: 'AI Labs',
    description:
      'Kumami AI Labs is dedicated to advancing research in artificial intelligence and blockchain integration. Explore cutting-edge projects, collaborate with leading technologists, and contribute to the development of next-generation solutions. Our labs provide resources for experimentation, innovation, and knowledge sharing, empowering users to shape the future of AI and decentralized technologies.',
  },
  Staking: {
    title: 'Staking',
    description:
      'Maximize your crypto earnings with Kumami Staking. Our platform offers secure token staking, real-time on-chain monitoring, and automated portfolio analysis. Benefit from competitive rewards, transparent performance tracking, and expert insights to optimize your investment strategy. Kumami Staking is designed for both novice and experienced users seeking to grow their assets in the dynamic world of decentralized finance.',
  },
}

const PRODUCT_ORDER: ProductKey[] = [
  'News Portal',
  'Education',
  'Games',
  'Gaming Guild',
  'AI Labs',
  'Staking',
]

// ─── Lightweight markdown renderer (matches CRA MarkdownRenderer) ─────────────

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_(?!\s)([^_\n]+?)_(?!_)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
      const safeHref = href.replace(/"/g, '&quot;')
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="text-[#96EDD6] hover:underline">${label}</a>`
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
      const isBulletBlock =
        lines.every((l) => /^\s*[-*•]\s+/.test(l) || l.trim() === '') &&
        lines.some((l) => /^\s*[-*•]\s+/.test(l))
      if (isBulletBlock) {
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
      return `<p class="mb-4 leading-relaxed">${parseInline(
        escapeHtml(block).replace(/\n/g, '<br />')
      )}</p>`
    })
    .join('')
}

// ─── Community lightbox ────────────────────────────────────────────────────────

interface CommunityLightboxProps {
  images: string[]
  startIndex: number
  onClose: () => void
}

function CommunityLightbox({ images, startIndex, onClose }: CommunityLightboxProps) {
  const [current, setCurrent] = useState(startIndex)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % images.length)
      if (e.key === 'ArrowLeft')
        setCurrent((c) => (c - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [images.length, onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          setCurrent((c) => (c - 1 + images.length) % images.length)
        }}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-13 h-13 flex items-center justify-center rounded-full border border-[#00c2c7]/50 bg-[#00c2c7]/15 text-[#00c2c7] text-2xl z-[10000] hover:bg-[#00c2c7]/25"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-[90vw] max-h-[90vh]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[current]}
          alt={`Community ${current + 1}`}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-[0_0_60px_rgba(0,194,199,0.2)]"
        />
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm text-zinc-400">
          {current + 1} / {images.length}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          setCurrent((c) => (c + 1) % images.length)
        }}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-13 h-13 flex items-center justify-center rounded-full border border-[#00c2c7]/50 bg-[#00c2c7]/15 text-[#00c2c7] text-2xl z-[10000] hover:bg-[#00c2c7]/25"
        aria-label="Next image"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full border border-white/20 bg-white/10 text-white text-xl z-[10000] hover:bg-white/20"
        aria-label="Close lightbox"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

// ─── Collage tile ──────────────────────────────────────────────────────────────

interface CollageTileProps {
  src: string
  index: number
  area: string
  onClick: (index: number) => void
}

function CollageTile({ src, index, area, onClick }: CollageTileProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  return (
    <div
      onClick={() => onClick(index)}
      style={{ gridArea: area }}
      className="rounded-xl overflow-hidden bg-[#0e1f20] cursor-pointer min-h-[150px]"
    >
      {!errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Community ${index + 1}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
          style={{ display: loaded ? 'block' : 'none' }}
        />
      )}
      {!loaded && !errored && (
        <div className="w-full h-full bg-[#0e1f20] min-h-[150px]" />
      )}
    </div>
  )
}

// ─── Community section ────────────────────────────────────────────────────────

function CommunitySection({ images }: { images: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <>
      <section
        id="community"
        className="mt-10 mb-8 px-4 scroll-mt-[160px]"
      >
        <h2 className="text-center text-3xl md:text-4xl font-bold text-[#40e0d0] mb-8">
          More than a space — it&apos;s where good times, good people, and great memories meet.
        </h2>

        <div
          className="mx-auto w-full max-w-[1200px] gap-2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(4, 220px)',
            gridTemplateAreas: `
              "a a b c"
              "d e b f"
              "g h h i"
              "j k k l"
            `,
          }}
        >
          {images.map((src, i) => (
            <CollageTile
              key={src}
              src={src}
              index={i}
              area={GRID_AREAS[i]}
              onClick={setLightboxIndex}
            />
          ))}
        </div>
      </section>

      {lightboxIndex !== null && (
        <CommunityLightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}

// ─── Trending news carousel ───────────────────────────────────────────────────

function TrendingNewsCarousel() {
  const [items, setItems] = useState<TrendingNewsItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrendingNews = async () => {
      try {
        const newsQuery = query(
          collection(db, 'news'),
          orderBy('timestamp', 'desc'),
          limit(20)
        )
        const snap = await getDocs(newsQuery)
        const all: TrendingNewsItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TrendingNewsItem, 'id'>),
        }))
        const published = all
          .filter((a) => a.status === 'published')
          .slice(0, 4)
        setItems(published)
      } catch (err) {
        console.error('Error fetching trending news:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrendingNews()
  }, [])

  useEffect(() => {
    if (items.length <= 1) return
    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % items.length)
    }, 5000)
    return () => clearInterval(id)
  }, [items.length])

  if (loading) {
    return (
      <div className="w-full max-w-[560px] mx-auto">
        <div className="rounded-[2rem] border-2 border-white h-[380px] flex items-center justify-center">
          <Loader className="w-8 h-8 animate-spin text-[#96EDD6]" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="w-full max-w-[560px] mx-auto">
        <div className="rounded-[2rem] border-2 border-white h-[380px] flex items-center justify-center">
          <p className="text-white">No trending news available.</p>
        </div>
      </div>
    )
  }

  const current = items[currentIndex]
  const image =
    current.imageUrl ||
    current.image ||
    current.thumbnail ||
    'https://kumami.world/og-default.png'

  return (
    <div className="w-full max-w-[560px] mx-auto">
      <div className="rounded-[2rem] border-2 border-white overflow-hidden relative">
        <Link href={`/news/${current.id}`} className="block">
          <div className="w-full relative" style={{ aspectRatio: '16/9' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={current.title || 'News'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="p-6 min-h-[180px]">
            {current.category && (
              <span className="inline-block px-3 py-1 rounded-full bg-[#96EDD6]/20 text-[#96EDD6] text-xs font-semibold mb-2">
                {current.category}
              </span>
            )}
            <h3 className="text-white text-xl font-bold mb-2 line-clamp-2">
              {current.title}
            </h3>
            <p className="text-gray-300 text-sm line-clamp-2">
              {current.summary || current.description}
            </p>
          </div>
        </Link>

        {items.length > 1 && (
          <div className="flex justify-center gap-2 pb-4">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-[#96EDD6] w-6' : 'bg-white/40'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Trending games carousel ──────────────────────────────────────────────────

function TrendingGamesCarousel() {
  const [items, setItems] = useState<TrendingGameItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrendingGames = async () => {
      try {
        const gamesQuery = query(collection(db, 'games'), limit(20))
        const snap = await getDocs(gamesQuery)
        const all: TrendingGameItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TrendingGameItem, 'id'>),
        }))
        setItems(all.slice(0, 4))
      } catch (err) {
        console.error('Error fetching trending games:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTrendingGames()
  }, [])

  useEffect(() => {
    if (items.length <= 1) return
    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % items.length)
    }, 5000)
    return () => clearInterval(id)
  }, [items.length])

  if (loading) {
    return (
      <div className="w-full max-w-[760px] mx-auto">
        <div className="rounded-[2rem] border-2 border-white h-[380px] flex items-center justify-center">
          <Loader className="w-8 h-8 animate-spin text-[#96EDD6]" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="w-full max-w-[760px] mx-auto">
        <div className="rounded-[2rem] border-2 border-white h-[380px] flex items-center justify-center">
          <p className="text-white">No trending games available.</p>
        </div>
      </div>
    )
  }

  const current = items[currentIndex]
  const image =
    current.thumbnail ||
    current.image ||
    current.imageUrl ||
    'https://kumami.world/og-default.png'

  return (
    <div className="w-full max-w-[760px] mx-auto">
      <div className="rounded-[2rem] border-2 border-white overflow-hidden relative">
        <div className="w-full relative" style={{ aspectRatio: '16/9' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={current.title || current.name || 'Game'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="p-6 min-h-[160px]">
          {current.category && (
            <span className="inline-block px-3 py-1 rounded-full bg-[#96EDD6]/20 text-[#96EDD6] text-xs font-semibold mb-2">
              {current.category}
            </span>
          )}
          <h3 className="text-white text-xl font-bold mb-2 line-clamp-1">
            {current.title || current.name}
          </h3>
          <p className="text-gray-300 text-sm line-clamp-2">
            {current.description}
          </p>
        </div>

        {items.length > 1 && (
          <div className="flex justify-center gap-2 pb-4">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-[#96EDD6] w-6' : 'bg-white/40'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── News Portal price card ───────────────────────────────────────────────────

function PriceCard({ price }: { price: PriceDetails }) {
  return (
    <div className="w-full md:w-[340px] rounded-2xl border border-[#96EDD6]/40 bg-[#0e1f20] p-6 flex flex-col">
      <div className="text-white text-sm mb-2">{price.label}</div>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold text-[#96EDD6]">{price.value}</span>
        <span className="text-gray-300">{price.unit}</span>
      </div>
      <ul className="space-y-2 mb-6 flex-1">
        {price.features.map((feature) => (
          <li
            key={feature}
            className="text-sm text-white flex items-start gap-2"
          >
            <span className="text-[#96EDD6] mt-0.5">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/pro"
        className="text-center rounded-full bg-[#96EDD6] text-[#102425] font-semibold px-4 py-2 hover:bg-[#96EDD6]/80 transition"
      >
        {price.button}
      </Link>
    </div>
  )
}

// ─── Main About Content ───────────────────────────────────────────────────────

export default function AboutContent() {
  const [selectedProduct, setSelectedProduct] = useState<ProductKey>('News Portal')
  const [aboutIntroContent, setAboutIntroContent] = useState<string>(DEFAULT_ABOUT_INTRO)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const ref = doc(db, 'app_config', 'about_us')
        const snap = await getDoc(ref)
        if (cancelled || !snap.exists()) return
        const data = snap.data() as { content?: unknown }
        const content = typeof data.content === 'string' ? data.content : ''
        if (content.trim()) {
          setAboutIntroContent(content)
        }
      } catch (err) {
        console.error('Error loading About Us content:', err)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const introHtml = renderMarkdown(aboutIntroContent)
  const currentProduct = PRODUCT_CONTENT[selectedProduct]

  const showComingSoon = selectedProduct === 'AI Labs' || selectedProduct === 'Staking'

  return (
    <div className="min-h-screen bg-[#101010] text-white pb-20">
      {/* Hero intro */}
      <section className="max-w-[1190px] mx-auto px-4 pt-14 pb-12">
        <h1 className="text-center text-3xl md:text-4xl font-bold text-[#40e0d0] mb-8">
          About Us
        </h1>
        <div
          className="text-center text-[17px] leading-[1.7] text-white max-w-[900px] mx-auto markdown-content"
          dangerouslySetInnerHTML={{ __html: introHtml }}
        />
      </section>

      {/* Products — menu + content grid */}
      <section className="max-w-[1200px] mx-auto px-4 flex flex-col lg:flex-row gap-8">
        {/* Left: product menu */}
        <aside className="lg:min-w-[260px] flex flex-col">
          <h2 className="text-2xl lg:text-3xl font-bold text-[#40e0d0] mb-4 ml-2">
            Our Products
          </h2>
          <div className="flex flex-col gap-4">
            {PRODUCT_ORDER.map((product) => {
              const isActive = selectedProduct === product
              const iconName = product.replace(/\s/g, '')
              return (
                <button
                  key={product}
                  onClick={() => setSelectedProduct(product)}
                  className={`menu-item flex items-center justify-between gap-4 rounded-[18px] px-4 py-4 min-h-[110px] min-w-[170px] transition-transform duration-300 hover:scale-[1.03] cursor-pointer ${
                    isActive
                      ? 'bg-[#96EDD6] text-[#102425] shadow-md'
                      : 'bg-[#153233]/25 text-white border border-[#baf7f0]'
                  }`}
                >
                  <span className="font-bold text-lg ml-2">{product}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/icons/${iconName}.png`}
                    alt={product}
                    width={44}
                    height={44}
                    className="object-contain mr-2"
                    style={{
                      filter: isActive
                        ? 'brightness(0) saturate(100%) invert(18%) sepia(16%) saturate(1200%) hue-rotate(130deg)'
                        : 'none',
                    }}
                  />
                </button>
              )
            })}
          </div>
        </aside>

        {/* Right: content card */}
        <div className="flex-1 bg-[#102425] rounded-[48px] lg:rounded-[100px] p-6 lg:p-12 shadow-2xl">
          <div className="flex flex-col gap-6">
            {/* Title (suppressed for Games/AI Labs/Staking which render their own) */}
            {!showComingSoon && selectedProduct !== 'Games' && (
              <h2 className="text-center text-3xl md:text-4xl font-bold text-[#40e0d0] mb-4">
                {selectedProduct === 'Education'
                  ? 'Learn Together with KUMAMI'
                  : currentProduct.title}
              </h2>
            )}

            {selectedProduct === 'News Portal' && (
              <>
                <div className="flex flex-col md:flex-row gap-6">
                  <p className="flex-1 text-base text-white leading-relaxed whitespace-pre-line text-justify">
                    {currentProduct.description}
                  </p>
                  {currentProduct.price && (
                    <PriceCard price={currentProduct.price} />
                  )}
                </div>
                <div className="mt-10">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                    Trending News
                  </h3>
                  <TrendingNewsCarousel />
                </div>
              </>
            )}

            {selectedProduct === 'Education' && (
              <div className="w-full">
                <p className="max-w-[650px] mx-auto mb-5 leading-relaxed text-center text-white text-base md:text-lg">
                  Many individuals struggle to find a user-friendly platform
                  that offers education on the Web 3 ecosystem. At Kumami.World,
                  we offer an easy-to-use learning platform with free modules
                  and both online and offline classes, helping people understand
                  Web3, AI, and more.
                </p>
                <div className="text-center my-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/education_aboutus.png"
                    alt="Crypto Wallet Education"
                    className="max-w-full h-auto inline-block"
                  />
                </div>
                <div className="flex flex-col items-center w-full">
                  <em className="text-white text-base text-center mb-8 flex flex-col items-center">
                    <em className="inline-block max-w-[560px] w-full leading-snug text-center mx-auto break-words">
                      &ldquo;Learning in Web3 is not just about knowledge— it&apos;s
                      about empowerment, ownership, and participation.&rdquo;
                    </em>
                    <div className="mt-8 text-white font-bold text-center w-full">
                      Learn with us and get On-chain certificate{' '}
                      <span role="img" aria-label="handshake">
                        🤝
                      </span>
                    </div>
                  </em>
                </div>
              </div>
            )}

            {selectedProduct === 'Games' && (
              <div className="w-full">
                <h2 className="text-center text-3xl md:text-4xl font-bold text-[#40e0d0] mb-6">
                  {currentProduct.title}
                </h2>
                <p className="text-base text-white leading-relaxed whitespace-pre-line text-justify mb-8">
                  {currentProduct.description}
                </p>
                <div className="mt-6">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                    Trending Games
                  </h3>
                  <TrendingGamesCarousel />
                </div>
              </div>
            )}

            {selectedProduct === 'Gaming Guild' && (
              <div className="w-full">
                <h3 className="text-center font-bold text-2xl text-[#96EDD6] mb-1">
                  Play, Earn and Connect With Us
                </h3>
                <h4 className="text-center font-bold text-2xl text-[#96EDD6] mb-10">
                  The Power of Web 3 Gaming Guild
                </h4>
                <div className="flex justify-center mb-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/gaming-guild/header.png"
                    alt="Gaming Guild"
                    className="w-full max-w-[500px] rounded-xl shadow-lg"
                  />
                </div>
                <p className="text-justify text-white text-base md:text-lg mb-8 max-w-[700px] mx-auto leading-relaxed">
                  Joining a Web3 gaming guild lets you unlock new earning
                  opportunities through play-to-earn games while connecting
                  with a global community of gamers. It&apos;s more than
                  gaming—it&apos;s a chance to learn blockchain, share resources,
                  and grow your digital assets together.
                </p>
                <hr className="border-t border-white my-8" />

                {/* Chaspa */}
                <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                  <div className="flex-1">
                    <h3 className="text-[#96EDD6] font-bold text-2xl mb-4">
                      Chaspa Gaming Guild
                    </h3>
                    <p className="text-white text-base leading-relaxed text-justify mb-6">
                      Chaspa is a dynamic gaming guild bridging Web2 &amp; Web3
                      worlds—connecting gamers across traditional and
                      blockchain gaming landscapes.
                    </p>
                    <div className="text-white text-base">
                      Details here :{' '}
                      <a
                        href="https://x.com/chaspaofficial?s=21"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#96EDD6] font-bold underline"
                      >
                        Chaspa GG
                      </a>
                    </div>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/gaming-guild/chaspa.jpg"
                    alt="Chaspa"
                    className="w-full md:w-[340px] rounded-lg object-cover"
                  />
                </div>

                {/* RememberUS */}
                <div className="flex flex-col md:flex-row-reverse items-center gap-8 mb-6">
                  <div className="flex-1">
                    <h3 className="text-[#96EDD6] font-bold text-2xl mb-4">
                      RememberUS Community
                    </h3>
                    <p className="text-white text-base leading-relaxed text-justify mb-2">
                      RememberUS is a vibrant community for gamers, developers,
                      and crypto enthusiasts to connect, share ideas, and
                      collaborate on exciting new projects.
                    </p>
                    <div className="text-white text-base">
                      Details here :{' '}
                      <a
                        href="https://x.com/0xrememberus?s=21"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#96EDD6] font-bold underline"
                      >
                        RememberUS
                      </a>
                    </div>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/gaming-guild/rememberus.jpg"
                    alt="RememberUS"
                    className="w-full md:w-[340px] rounded-lg object-cover"
                  />
                </div>
              </div>
            )}

            {showComingSoon && (
              <div className="w-full flex items-center justify-center py-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/comingsoon.png"
                  alt="Coming Soon"
                  className="w-full max-w-[900px] h-auto rounded-3xl object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Community */}
      <CommunitySection images={COLLAGE_IMAGES} />
    </div>
  )
}
