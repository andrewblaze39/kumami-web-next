'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Loader } from 'lucide-react'

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
}

function hasCategory(game: Game, category: string): boolean {
  const targetCategory = category.trim().toLowerCase()

  if (Array.isArray(game.categories)) {
    return game.categories.some(
      (cat) => cat && cat.toString().trim().toLowerCase() === targetCategory
    )
  }

  if (game.category) {
    return game.category.toString().trim().toLowerCase() === targetCategory
  }

  return false
}

export default function FeaturedGamesGrid() {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchGames = useCallback(async () => {
    try {
      setIsLoading(true)
      const gamesCollection = collection(db, 'games')
      const gamesSnapshot = await getDocs(gamesCollection)
      const gamesData: Game[] = gamesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Game, 'id'>),
      }))

      const featuredGames = gamesData.filter(
        (game) =>
          hasCategory(game, 'Featured') &&
          game.status?.toLowerCase() !== 'draft'
      )

      setGames(featuredGames)
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
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Featured Games</h1>
          <Link
            href="/games"
            className="rounded-lg px-6 py-2.5 text-sm transition-all duration-300 ease-in-out border border-[#96EDD6] bg-transparent text-[#96EDD6] hover:bg-[#96EDD6] hover:text-[#102425] no-underline"
          >
            Back to Games
          </Link>
        </div>

        {games.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {games.map((game) => (
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
              No featured games available
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
