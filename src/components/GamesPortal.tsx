'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Loader } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Game {
  id: string
  title?: string
  tagline?: string
  caption?: string
  status?: string
  categories?: string[]
  category?: string
  genres?: string[]
  genre?: string
  platformType?: string
  platformTypes?: string[]
  releasedOn?: { toDate: () => Date } | string
  portraitImageUrl?: string
  catalogImageUrl?: string
  landscapeImageUrl?: string
  imageDetail1Url?: string
  carouselImageUrl?: string
}

interface CarouselImage {
  id: string
  imageUrl: string
  title: string
  tagline: string
  portraitImageUrl?: string
  catalogImageUrl?: string
  landscapeImageUrl?: string
  imageDetail1Url?: string
  carouselImageUrl?: string
  categories?: string[]
  category?: string
  genres?: string[]
  genre?: string
  platformType?: string
  platformTypes?: string[]
  releasedOn?: { toDate: () => Date } | string
  caption?: string
  status?: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function hasCategory(game: Game, category: string): boolean {
  const target = category.trim().toLowerCase()
  if (Array.isArray(game.categories)) {
    return game.categories.some(
      (cat) => cat && cat.toString().trim().toLowerCase() === target
    )
  }
  if (game.category) {
    return game.category.toString().trim().toLowerCase() === target
  }
  return false
}

function filterBySearch(games: Game[], term: string): Game[] {
  if (!term.trim()) return games
  const lower = term.toLowerCase()

  return games.filter((game) => {
    const titleMatch = game.title?.toLowerCase().includes(lower) ?? false
    const taglineMatch = game.tagline?.toLowerCase().includes(lower) ?? false

    const genresArray: string[] = Array.isArray(game.genres)
      ? game.genres
      : game.genre
        ? [game.genre]
        : []
    const genreMatch = genresArray.some((g) =>
      String(g).toLowerCase().includes(lower)
    )

    const platformTypesArray: string[] = Array.isArray(game.platformTypes)
      ? game.platformTypes
      : game.platformType
        ? [game.platformType]
        : []
    const platformMatch = platformTypesArray.some((p) =>
      String(p).toLowerCase().includes(lower)
    )

    return titleMatch || taglineMatch || genreMatch || platformMatch
  })
}

function filterByPlatforms(games: Game[], platforms: string[]): Game[] {
  if (platforms.length === 0) return games
  return games.filter((game) =>
    platforms.some((platform) => {
      if (!game.platformType) return false
      const gp = game.platformType.toLowerCase()
      if (platform === 'PC') return gp === 'pc'
      if (platform === 'Website') return gp === 'website'
      if (platform === 'Mobile App') return gp === 'mobile app'
      return false
    })
  )
}

function getRandomGames(games: Game[], count: number): Game[] {
  if (!games.length) return []
  const shuffled = [...games].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function getGameImage(game: Game): string | undefined {
  return game.portraitImageUrl || game.catalogImageUrl || game.landscapeImageUrl
}

function gameDetailUrl(title: string | undefined): string {
  return `/game-details?name=${encodeURIComponent(title ?? '')}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GamesPortal() {
  const router = useRouter()

  // Data
  const [allGames, setAllGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Carousel
  const [current, setCurrent] = useState(0)
  const autoSlideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Filtered section states
  const [filteredAllGames, setFilteredAllGames] = useState<Game[]>([])
  const [filteredMostPopular, setFilteredMostPopular] = useState<Game[]>([])
  const [filteredFreeToPlay, setFilteredFreeToPlay] = useState<Game[]>([])
  const [filteredComingSoon, setFilteredComingSoon] = useState<Game[]>([])

  /* ---- Firestore fetch ---- */
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setIsLoading(true)
        const gamesCollection = collection(db, 'games')
        const snapshot = await getDocs(gamesCollection)
        const data: Game[] = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Game, 'id'>),
          }))
          .filter((g) => g.status !== 'draft')
        setAllGames(data)
      } catch (error) {
        console.error('Error fetching games:', error)
        setAllGames([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchGames()
  }, [])

  /* ---- Derived: carousel images (unfiltered) ---- */
  const allFeaturedGames = allGames.filter((g) => hasCategory(g, 'Featured'))

  const images: CarouselImage[] = allFeaturedGames
    .slice(0, 4)
    .filter((g) => g)
    .map((g) => ({
      ...g,
      imageUrl: g.imageDetail1Url || g.carouselImageUrl || g.portraitImageUrl || '',
      title: g.title || 'Game Image',
      id: g.id,
      tagline: g.tagline || g.caption || '',
    }))
    .filter((item) => item.imageUrl)

  const currentFeaturedGame: Partial<Game> = images[current] || allFeaturedGames[0] || {}

  /* ---- Derived: filtered featured games ---- */
  const featuredGames = (() => {
    let games = allGames.filter((g) => hasCategory(g, 'Featured'))
    if (selectedPlatforms.length > 0) games = filterByPlatforms(games, selectedPlatforms)
    if (searchTerm.trim()) games = filterBySearch(games, searchTerm)
    return games.slice(0, 4)
  })()

  /* ---- Update filtered sections ---- */
  const applyFilters = useCallback(
    (category: string | null, limit: number, randomize = false): Game[] => {
      let games = category
        ? allGames.filter((g) => hasCategory(g, category))
        : [...allGames]
      if (selectedPlatforms.length > 0) games = filterByPlatforms(games, selectedPlatforms)
      if (searchTerm.trim()) games = filterBySearch(games, searchTerm)
      return randomize ? getRandomGames(games, limit) : games.slice(0, limit)
    },
    [allGames, selectedPlatforms, searchTerm]
  )

  useEffect(() => {
    if (allGames.length > 0) {
      setFilteredAllGames(applyFilters(null, 4, true))
      setFilteredMostPopular(applyFilters('Most Popular', 5))
      setFilteredFreeToPlay(applyFilters('Free to Play', 5))

      const sorted = applyFilters('Coming Soon', 100)
        .sort((a, b) => {
          if (!a.releasedOn || !b.releasedOn) return 0
          const dateA =
            typeof a.releasedOn === 'string'
              ? new Date(a.releasedOn)
              : a.releasedOn.toDate()
          const dateB =
            typeof b.releasedOn === 'string'
              ? new Date(b.releasedOn)
              : b.releasedOn.toDate()
          return dateA.getTime() - dateB.getTime()
        })
        .slice(0, 5)
      setFilteredComingSoon(sorted)
    }
  }, [allGames, selectedPlatforms, searchTerm, applyFilters])

  /* ---- Carousel auto-slide ---- */
  const resetAutoSlideTimer = useCallback(() => {
    if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current)
    if (images.length > 0) {
      autoSlideTimerRef.current = setInterval(() => {
        setCurrent((prev) => (prev + 1) % images.length)
      }, 8000)
    }
  }, [images.length])

  useEffect(() => {
    resetAutoSlideTimer()
    return () => {
      if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current)
    }
  }, [resetAutoSlideTimer])

  /* Preload carousel images */
  useEffect(() => {
    images.forEach((img) => {
      if (img.imageUrl) {
        const preload = new Image()
        preload.src = img.imageUrl
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % images.length)
    resetAutoSlideTimer()
  }

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length)
    resetAutoSlideTimer()
  }

  /* ---- Platform filter ---- */
  const handlePlatformChange = (platform: string, checked: boolean) => {
    setSelectedPlatforms((prev) =>
      checked ? [...prev, platform] : prev.filter((p) => p !== platform)
    )
  }

  /* Close filter dropdown on outside click */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* ---- Open game detail ---- */
  const openGame = (title: string | undefined) => {
    window.open(gameDetailUrl(title), '_blank')
  }

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */
  if (isLoading || !allGames.length) {
    return (
      <div
        className="min-h-screen text-white font-sans flex justify-center items-center"
        style={{ background: '#050608' }}
      >
        <div className="flex flex-col items-center">
          <Loader className="h-16 w-16 text-[#96EDD6] animate-spin" />
          <div className="text-lg font-medium mt-4">Loading games...</div>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div
      className="min-h-screen text-white font-sans"
      style={{ background: 'linear-gradient(135deg, #102425 0%, #050608 100%)' }}
    >
      {/* ============================================================ */}
      {/*  HERO — Mobile Carousel                                       */}
      {/* ============================================================ */}
      <div className="w-full relative">
        <div className="relative w-full md:hidden" style={{ aspectRatio: '16/9' }}>
          {images.length > 0 ? (
            <div className="relative w-full h-full">
              {images.map((image, index) => (
                <div
                  key={image.id + index}
                  className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-500"
                  style={{
                    backgroundImage: `url(${image.imageUrl})`,
                    opacity: index === current ? 1 : 0,
                    zIndex: index === current ? 1 : 0,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                    {index === current && (
                      <div
                        className="absolute bottom-0 left-0 right-0 p-6 text-white cursor-pointer"
                        onClick={() => openGame(image.title)}
                      >
                        <h2 className="text-xl font-bold mb-1">
                          {image.title || 'Featured Game'}
                        </h2>
                        <p className="text-xs text-gray-200 line-clamp-2">
                          {image.tagline || 'Experience the latest and greatest games'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination Dots */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-10">
                  {images.map((_, index) => (
                    <div
                      key={`dot-mobile-${index}`}
                      onClick={() => setCurrent(index)}
                      className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-110 ${
                        current === index
                          ? 'bg-[#96EDD6] shadow-lg shadow-[#96EDD6]/50'
                          : 'bg-gray-600 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Nav Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center z-10"
                aria-label="Previous"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center z-10"
                aria-label="Next"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
              <p className="text-white/70">No featured games available</p>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  HERO — Desktop Carousel + Info Panel                        */}
        {/* ============================================================ */}
        <div className="hidden md:flex flex-row items-stretch justify-between gap-8 px-8 py-6 max-w-7xl mx-auto">
          {/* Carousel */}
          <div className="group w-full max-w-4xl aspect-video relative rounded-2xl overflow-hidden">
            {images.length > 0 ? (
              <div className="relative w-full h-full">
                {images.map((image, index) => (
                  <div
                    key={image.id + '-desktop-' + index}
                    className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-500"
                    style={{
                      backgroundImage: `url(${image.imageUrl})`,
                      opacity: index === current ? 1 : 0,
                      zIndex: index === current ? 1 : 0,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                  </div>
                ))}

                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center z-30 hover:bg-black/70 transition"
                  aria-label="Previous"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center z-30 hover:bg-black/70 transition"
                  aria-label="Next"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800/50 rounded-2xl">
                <p className="text-white/70">No featured games available</p>
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="relative w-[500px] flex flex-col justify-between rounded-2xl overflow-hidden aspect-video">
            <div className="absolute inset-0 bg-black/40 rounded-2xl" style={{ zIndex: 0 }} />

            <div className="relative z-10 flex flex-col gap-2 mt-8 p-6">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                {currentFeaturedGame.title || 'Featured Game'}
              </h1>
              <p className="text-base text-white/80 mb-4">
                {currentFeaturedGame.tagline ||
                  currentFeaturedGame.caption ||
                  'Experience the latest and greatest games'}
              </p>
            </div>

            <div className="relative z-10 flex flex-col gap-6 p-6 pt-0">
              <button
                className="rounded-lg px-6 py-2 text-base font-normal w-fit transition-all duration-300 ease-in-out border border-[#96EDD6] text-[#96EDD6] bg-transparent hover:bg-[#96EDD6] hover:text-[#102425]"
                onClick={() => openGame(currentFeaturedGame.title)}
              >
                Learn More
              </button>

              {/* Pagination Dots */}
              {images.length > 1 && (
                <div className="flex justify-center space-x-2 mt-2">
                  {images.map((_, index) => (
                    <div
                      key={`dot-desktop-${index}`}
                      onClick={() => setCurrent(index)}
                      className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-110 ${
                        current === index
                          ? 'bg-[#96EDD6] shadow-lg shadow-[#96EDD6]/50'
                          : 'bg-gray-600 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Search + Platform Filter + Featured Games                    */}
      {/* ============================================================ */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search bar + filter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center justify-end w-full relative">
            <div
              className="flex items-center rounded-full px-4 py-2 max-w-[320px] w-full"
              style={{ background: 'rgba(46,97,98,0.6)' }}
            >
              <Search className="w-5 h-5 text-white/80 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Find Games"
                className="bg-transparent text-white/90 placeholder:text-white/60 outline-none w-full text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className="ml-2 p-2 rounded-full bg-transparent hover:bg-white/10 transition"
              onClick={() => setShowFilter((prev) => !prev)}
            >
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </button>

            {showFilter && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] z-[9999]"
                ref={filterRef}
              >
                <div className="bg-[#3A7573] rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.15)] p-3 w-[200px] text-white">
                  <div className="font-bold text-base mb-1.5">Platform</div>
                  {(['PC', 'Website', 'Mobile App'] as const).map((platform) => (
                    <label
                      key={platform}
                      className="flex items-center gap-1.5 text-sm font-normal"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-white"
                        value={platform}
                        checked={selectedPlatforms.includes(platform)}
                        onChange={(e) =>
                          handlePlatformChange(e.target.value, e.target.checked)
                        }
                      />{' '}
                      {platform}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Featured Games */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold">Featured Games</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {featuredGames.map((game) => (
            <GameCard key={game.id} game={game} onOpen={openGame} />
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  All Games                                                    */}
      {/* ============================================================ */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold">All Games</h2>
          <button
            className="rounded-lg px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm transition-all duration-300 ease-in-out border border-[#96EDD6] bg-transparent text-[#96EDD6] hover:bg-[#96EDD6] hover:text-[#102425]"
            onClick={() => router.push('/all-games')}
          >
            View More
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {filteredAllGames.map((game, i) => (
            <GameCard key={game.id || `all-${i}`} game={game} onOpen={openGame} />
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Most Popular / Free to Play / Coming Soon                    */}
      {/* ============================================================ */}
      <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 justify-center">
        {/* Most Popular */}
        <div className="relative">
          <h3 className="font-bold text-2xl mb-4">Most Popular</h3>
          <div className="flex flex-col gap-4 items-center">
            {filteredMostPopular.map((game) => (
              <GameListItem key={game.id} game={game} onOpen={openGame} />
            ))}
          </div>
          <div className="hidden md:block absolute top-0 right-0 h-full w-px bg-gray-400/30" />
        </div>

        {/* Free to Play */}
        <div className="relative">
          <h3 className="font-bold text-2xl mb-4">Free to Play</h3>
          <div className="flex flex-col gap-4 items-center">
            {filteredFreeToPlay.map((game, idx) => (
              <GameListItem
                key={game.id || `ftp-${idx}`}
                game={game}
                onOpen={openGame}
                showGenres
              />
            ))}
          </div>
          <div className="hidden md:block absolute top-0 right-0 h-full w-px bg-gray-400/30" />
        </div>

        {/* Coming Soon */}
        <div>
          <h3 className="font-bold text-2xl mb-4">Coming Soon</h3>
          <div className="flex flex-col gap-4 items-center">
            {filteredComingSoon.map((game, idx) => (
              <GameListItem
                key={game.id || `cs-${idx}`}
                game={game}
                onOpen={openGame}
                showGenres
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function GameCard({
  game,
  onOpen,
}: {
  game: Game
  onOpen: (title: string | undefined) => void
}) {
  const imgSrc = getGameImage(game)

  return (
    <div className="w-11/12 mx-auto">
      <div
        className="group aspect-[3/4] bg-gray-200/30 rounded-2xl overflow-hidden transition-all duration-300 ease-in-out hover:scale-105 cursor-pointer"
        onClick={() => onOpen(game.title)}
      >
        {imgSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imgSrc}
            alt={game.title || 'Game thumbnail'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.currentTarget
              target.src = '/placeholder-game.png'
              target.onerror = null
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700/50">
            <span className="text-white/60">No image</span>
          </div>
        )}
      </div>
      <div className="mt-3 text-center">
        <h3 className="text-white font-semibold text-lg">
          {game.title || 'Untitled Game'}
        </h3>
      </div>
    </div>
  )
}

function GameListItem({
  game,
  onOpen,
  showGenres = false,
}: {
  game: Game
  onOpen: (title: string | undefined) => void
  showGenres?: boolean
}) {
  const imgSrc = getGameImage(game)

  return (
    <div
      className="flex items-center gap-2 cursor-pointer rounded transition relative group w-full px-2 py-2"
      onClick={() => onOpen(game.title)}
      style={{ minHeight: '100px' }}
    >
      <span className="absolute inset-0 rounded bg-transparent group-hover:bg-[#163232]/10 transition-all duration-200 z-0" />
      <div className="w-20 aspect-[3/4] bg-gray-200/30 rounded-md overflow-hidden z-10">
        {imgSrc && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imgSrc}
            alt={game.title ?? 'Game'}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="z-10">
        <span className="font-medium">{game.title}</span>
        {showGenres && game.genres && (
          <div className="text-xs text-gray-300">{game.genres.join(', ')}</div>
        )}
      </div>
    </div>
  )
}
