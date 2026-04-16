'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Loader, Search, SlidersHorizontal } from 'lucide-react'

interface Game {
  id: string
  title?: string
  categories?: string[]
  category?: string
  status?: string
  portraitImageUrl?: string
  catalogImageUrl?: string
  landscapeImageUrl?: string
  genre?: string
  tagline?: string
  platformType?: string
}

const PLATFORMS = ['PC', 'Website', 'Mobile App'] as const

export default function AllGamesGrid() {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (
        filterRef.current &&
        !filterRef.current.contains(target) &&
        !target.closest('#filterBtn')
      ) {
        setShowFilter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchGames = useCallback(async () => {
    try {
      setIsLoading(true)
      const gamesCollection = collection(db, 'games')
      const gamesSnapshot = await getDocs(gamesCollection)
      const gamesData: Game[] = gamesSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Game, 'id'>),
        }))
        .filter((game) => game.status !== 'draft')

      setGames(gamesData)
    } catch (error) {
      console.error('Error fetching games:', error)
      setGames([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  // Search filter
  function filterBySearch(list: Game[]): Game[] {
    if (!searchTerm.trim()) return list
    const term = searchTerm.toLowerCase()
    return list.filter(
      (game) =>
        (game.title && game.title.toLowerCase().includes(term)) ||
        (game.tagline && game.tagline.toLowerCase().includes(term)) ||
        (game.genre && game.genre.toLowerCase().includes(term)) ||
        (game.platformType && game.platformType.toLowerCase().includes(term))
    )
  }

  // Platform filter
  function filterByPlatform(list: Game[]): Game[] {
    if (selectedPlatforms.length === 0) return list
    return list.filter((game) => {
      if (!game.platformType) return false
      const gamePlatform = game.platformType.toLowerCase()
      return selectedPlatforms.some((platform) => {
        if (platform === 'PC') return gamePlatform === 'pc'
        if (platform === 'Website') return gamePlatform === 'website'
        if (platform === 'Mobile App') return gamePlatform === 'mobile app'
        return false
      })
    })
  }

  function handlePlatformChange(platform: string, checked: boolean) {
    setSelectedPlatforms((prev) =>
      checked ? [...prev, platform] : prev.filter((p) => p !== platform)
    )
  }

  const filteredGames = filterBySearch(filterByPlatform(games))

  if (isLoading) {
    return (
      <div
        className="min-h-screen text-white font-sans flex justify-center items-center"
        style={{
          background: 'linear-gradient(135deg, #3A7A7A 0%, #102425 100%)',
        }}
      >
        <div className="flex flex-col items-center">
          <Loader className="h-16 w-16 text-[#96EDD6] animate-spin" />
          <div className="text-lg font-medium mt-4">Loading games...</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen text-white font-sans"
      style={{
        background: 'linear-gradient(135deg, #3A7A7A 0%, #102425 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">All Games</h1>
          <Link
            href="/games"
            className="rounded-lg px-6 py-2.5 text-sm transition-all duration-300 ease-in-out border border-[#96EDD6] bg-transparent text-[#96EDD6] hover:bg-[#96EDD6] hover:text-[#102425] no-underline"
          >
            Back to Games
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="relative w-full max-w-md">
            <div
              className="flex items-center rounded-full px-4 py-2 w-full"
              style={{ background: 'rgba(46,97,98,0.6)' }}
            >
              <Search className="w-5 h-5 text-white/80 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search games..."
                className="bg-transparent text-white/90 placeholder:text-white/60 outline-none w-full text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <button
              id="filterBtn"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2e6162] text-white hover:bg-[#3a7a7a] transition w-full sm:w-auto justify-center"
              onClick={() => setShowFilter(!showFilter)}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filter</span>
            </button>

            {showFilter && (
              <div className="absolute right-0 mt-2 w-48 bg-[#3A7573] rounded-lg shadow-lg z-10 p-3">
                <div className="font-bold mb-2">Platform</div>
                <div className="space-y-2">
                  {PLATFORMS.map((platform) => (
                    <label
                      key={platform}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        className="rounded text-[#96EDD6] focus:ring-[#96EDD6]"
                        checked={selectedPlatforms.includes(platform)}
                        onChange={(e) =>
                          handlePlatformChange(platform, e.target.checked)
                        }
                      />
                      <span>{platform}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Games Grid */}
        {filteredGames.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGames.map((game) => (
              <div key={game.id} className="space-y-2">
                <div
                  className="group aspect-[3/4] bg-transparent rounded-2xl overflow-hidden transition-all duration-300 ease-in-out cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/game-details?name=${encodeURIComponent(game.title ?? '')}`
                    )
                  }
                >
                  <div className="relative w-full h-full">
                    {game.portraitImageUrl ||
                    game.catalogImageUrl ||
                    game.landscapeImageUrl ? (
                      <img
                        src={
                          game.portraitImageUrl ||
                          game.catalogImageUrl ||
                          game.landscapeImageUrl
                        }
                        alt={game.title || 'Game thumbnail'}
                        className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.src = '/placeholder-game.png'
                          target.onerror = null
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-700/50 rounded-2xl">
                        <span className="text-white/60">No image</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-1">
                  <h3 className="text-white font-medium text-base">
                    {game.title}
                  </h3>
                  {game.genre && (
                    <span className="bg-[#163232] text-[#96EDD6] rounded-full px-2 py-0.5 text-xs font-semibold mt-1 inline-block">
                      {game.genre}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center py-12">
            <p className="text-xl text-white/70">
              No games found matching your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
