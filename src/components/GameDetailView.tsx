'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader, Globe, Send, MessageSquare, Share2, Monitor, Smartphone, Gamepad2 } from 'lucide-react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
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
  network?: string
  networks?: string[]
  portraitImageUrl?: string
  catalogImageUrl?: string
  landscapeImageUrl?: string
  imageDetail1Url?: string
  imageDetail2Url?: string
  carouselImageUrl?: string
  description?: string[]
  detailContent1?: string
  detailContent2?: string
  discordLink?: string
  twitterLink?: string
  websiteLink?: string
  telegramLink?: string
  appStoreLink?: string
  playStoreLink?: string
  webPlayLink?: string
  windowsLink?: string
  macLink?: string
  playNowButtonLink?: string
  releasedOn?: { toDate: () => Date } | string
  timestamp?: { toDate: () => Date } | { toMillis: () => number }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatContent(text: string | undefined): string {
  if (!text) return ''

  // Replace newlines with <br> tags
  let formatted = text.replace(/\n/g, '<br>')

  // Replace *text* with <strong>text</strong> for bold
  formatted = formatted.replace(/\*(.*?)\*/g, '<strong>$1</strong>')

  // Replace _text_ with <em>text</em> for italics
  formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>')

  // Replace `text` with <code>text</code> for code
  formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')

  // Replace ## text with <h2>text</h2> for headings
  formatted = formatted.replace(/##\s(.*?)<br>/g, '<h2>$1</h2>')

  // Replace # text with <h1>text</h1> for headings
  formatted = formatted.replace(/#\s(.*?)<br>/g, '<h1>$1</h1>')

  return formatted
}

function toStringArray(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value) return [value]
  return []
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface GameDetailViewProps {
  gameName: string | undefined
}

export default function GameDetailView({ gameName }: GameDetailViewProps) {
  const router = useRouter()

  const [gameData, setGameData] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moreGames, setMoreGames] = useState<Game[]>([])

  useEffect(() => {
    const fetchGameData = async () => {
      if (!gameName) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const gamesRef = collection(db, 'games')
        const q = query(gamesRef, where('title', '==', gameName))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const gameDoc = querySnapshot.docs[0]
          const data = { id: gameDoc.id, ...(gameDoc.data() as Omit<Game, 'id'>) }

          if (data.status !== 'draft') {
            setGameData(data)

            // Load more games
            try {
              const moreQuery = query(
                collection(db, 'games'),
                orderBy('timestamp', 'desc'),
                limit(6),
              )
              const moreSnap = await getDocs(moreQuery)
              const others = moreSnap.docs
                .map((d) => ({ id: d.id, ...(d.data() as Omit<Game, 'id'>) }))
                .filter((g) => g.id !== data.id && g.status !== 'draft')
                .slice(0, 5)
              setMoreGames(others)
            } catch (moreErr) {
              console.error('Error fetching more games:', moreErr)
            }
          } else {
            setError('Game not found')
          }
        } else {
          setError('Game not found')
        }
      } catch (err) {
        console.error('Error fetching game data:', err)
        setError('Failed to load game data')
      } finally {
        setLoading(false)
      }
    }

    fetchGameData()
  }, [gameName])

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div
        className="min-h-screen font-sans text-white flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #102425 0%, #050608 100%)' }}
      >
        <div className="flex flex-col items-center">
          <Loader className="h-16 w-16 text-[#96EDD6] animate-spin" />
          <div className="text-lg font-medium mt-4">Loading...</div>
        </div>
      </div>
    )
  }

  /* ---- 404 / no game name ---- */
  if (!gameName || !gameData) {
    return (
      <div
        className="min-h-screen font-sans text-white flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #102425 0%, #050608 100%)' }}
      >
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-white/20 mb-4">404</h1>
            <h2 className="text-2xl font-bold mb-2">No Game Found</h2>
            <p className="text-white/80 mb-8">
              Sorry, we couldn&apos;t find the game you&apos;re looking for.
            </p>
          </div>
          <button
            onClick={() => router.push('/games')}
            className="bg-[#96EDD6] text-[#163232] rounded-lg px-8 py-3 text-lg font-bold transition-all duration-200 hover:bg-[#163232] hover:text-[#96EDD6] hover:scale-105 shadow-md hover:shadow-xl"
          >
            Return to Games Page
          </button>
        </div>
      </div>
    )
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div
        className="min-h-screen font-sans text-white flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #102425 0%, #050608 100%)' }}
      >
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-white/20 mb-4">404</h1>
            <h2 className="text-2xl font-bold mb-2">Game Not Found</h2>
            <p className="text-white/80 mb-8">{error}</p>
          </div>
          <button
            onClick={() => router.push('/games')}
            className="bg-[#96EDD6] text-[#163232] rounded-lg px-8 py-3 text-lg font-bold transition-all duration-200 hover:bg-[#163232] hover:text-[#96EDD6] hover:scale-105 shadow-md hover:shadow-xl"
          >
            Return to Games Page
          </button>
        </div>
      </div>
    )
  }

  const genres = toStringArray(gameData.genres?.length ? gameData.genres : undefined).length > 0
    ? toStringArray(gameData.genres)
    : toStringArray(gameData.genre)

  const platformTypes = toStringArray(gameData.platformTypes?.length ? gameData.platformTypes : undefined).length > 0
    ? toStringArray(gameData.platformTypes)
    : toStringArray(gameData.platformType)

  const networks = toStringArray(gameData.networks?.length ? gameData.networks : undefined).length > 0
    ? toStringArray(gameData.networks)
    : toStringArray(gameData.network)

  const hasSocialLinks = gameData.discordLink || gameData.twitterLink || gameData.websiteLink || gameData.telegramLink
  const hasStoreBadges = gameData.appStoreLink || gameData.playStoreLink || gameData.webPlayLink || gameData.windowsLink || gameData.macLink

  return (
    <div
      className="font-sans text-white min-h-screen"
      style={{ background: 'linear-gradient(135deg, #102425 0%, #050608 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Breadcrumb */}
        <div className="flex justify-between items-center pt-8">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Link
              href="/games"
              className="cursor-pointer hover:text-[#96EDD6] transition no-underline text-white/80"
            >
              Games Page
            </Link>
            <span className="mx-1">&gt;</span>
            <span className="text-[#96EDD6]">Game Details</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold mt-6">
          {gameData.title || gameName}
        </h1>

        {/* Main Media & Info */}
        <div className="flex flex-col md:flex-row gap-8 mt-8">
          {/* Left — Main Image + Info Pills */}
          <div className="flex-1">
            {gameData.imageDetail1Url && (
              <div className="bg-[#163232] rounded-2xl w-full aspect-video overflow-hidden mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gameData.imageDetail1Url}
                  alt={`${gameData.title} - Main`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Info Pills */}
            <div className="flex gap-6 mt-4 justify-center md:justify-between w-full flex-wrap">
              {/* Categories */}
              {gameData.categories && gameData.categories.length > 0 && (
                <div>
                  <div className="text-xs font-bold mb-2">Categories</div>
                  <div className="flex gap-2 flex-wrap">
                    {gameData.categories.map((category, index) => (
                      <span
                        key={index}
                        className="bg-[#96EDD6] text-[#102425] rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Genre */}
              <div>
                <div className="text-xs font-bold mb-2">Genre</div>
                <div className="flex gap-2 flex-wrap">
                  {genres.length > 0 ? (
                    genres.map((g, index) => (
                      <span
                        key={index}
                        className="bg-[#163232] text-white/90 rounded px-3 py-1 text-xs"
                      >
                        {g}
                      </span>
                    ))
                  ) : (
                    <span className="bg-[#163232] text-white/90 rounded px-3 py-1 text-xs">
                      Unknown
                    </span>
                  )}
                </div>
              </div>

              {/* Platform Type */}
              <div>
                <div className="text-xs font-bold mb-2">Platform Type</div>
                <div className="flex gap-2 flex-wrap">
                  {platformTypes.length > 0 ? (
                    platformTypes.map((p, index) => (
                      <span
                        key={index}
                        className="bg-[#163232] text-white/90 rounded px-3 py-1 text-xs"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="bg-[#163232] text-white/90 rounded px-3 py-1 text-xs">
                      Unknown
                    </span>
                  )}
                </div>
              </div>

              {/* Network */}
              <div>
                <div className="text-xs font-bold mb-2">Network</div>
                <div className="flex gap-2 flex-wrap">
                  {networks.length > 0 ? (
                    networks.map((n, index) => (
                      <span
                        key={index}
                        className="bg-[#163232] text-white/90 rounded px-3 py-1 text-xs"
                      >
                        {n}
                      </span>
                    ))
                  ) : (
                    <span className="bg-[#163232] text-white/90 rounded px-3 py-1 text-xs">
                      Unknown
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right — Social Links, Store Badges, Play Now */}
          <div className="w-full md:w-[320px] flex flex-col gap-6 items-center md:items-end">
            {/* Social Links */}
            {hasSocialLinks && (
              <div className="md:mt-[267px] mt-2 w-full flex items-start mb-2">
                <div className="flex gap-3 mb-2 justify-start w-full">
                  {gameData.discordLink && (
                    <a
                      href={gameData.discordLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-[#96EDD6] transition-all duration-300 hover:scale-110 no-underline text-xl"
                    >
                      <MessageSquare className="w-6 h-6" />
                    </a>
                  )}
                  {gameData.twitterLink && (
                    <a
                      href={gameData.twitterLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-[#96EDD6] transition-all duration-300 hover:scale-110 no-underline text-xl"
                    >
                      <Share2 className="w-6 h-6" />
                    </a>
                  )}
                  {gameData.websiteLink && (
                    <a
                      href={gameData.websiteLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-[#96EDD6] transition-all duration-300 hover:scale-110 no-underline text-xl"
                    >
                      <Globe className="w-6 h-6" />
                    </a>
                  )}
                  {gameData.telegramLink && (
                    <a
                      href={gameData.telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-[#96EDD6] transition-all duration-300 hover:scale-110 no-underline text-xl"
                    >
                      <Send className="w-6 h-6" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Social links spacer when no social links but need alignment */}
            {!hasSocialLinks && (
              <div className="md:mt-[267px] mt-2 w-full" />
            )}

            {/* Store Badges */}
            {hasStoreBadges && (
              <div className="w-full flex flex-col gap-2 items-start">
                <span className="text-base font-bold mb-1">Available On</span>
                <div className="flex gap-2 flex-wrap">
                  {gameData.appStoreLink && (
                    <a
                      href={gameData.appStoreLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/icons/appstore.png"
                        alt="App Store"
                        className="h-12 object-contain transition-transform duration-200 hover:scale-110 hover:drop-shadow-lg cursor-pointer"
                      />
                    </a>
                  )}
                  {gameData.playStoreLink && (
                    <a
                      href={gameData.playStoreLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/icons/playstore.png"
                        alt="Play Store"
                        className="h-12 object-contain transition-transform duration-200 hover:scale-110 hover:drop-shadow-lg cursor-pointer"
                      />
                    </a>
                  )}
                  {gameData.webPlayLink && (
                    <a
                      href={gameData.webPlayLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-underline"
                    >
                      <div className="h-12 w-[120px] flex items-center bg-black rounded-lg border border-white/30 transition-transform duration-200 hover:scale-105 cursor-pointer overflow-hidden">
                        <div className="flex items-center justify-center w-10 h-full">
                          <Globe className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col justify-center leading-none">
                          <span className="text-white/60 text-[9px] uppercase tracking-wide">Play it on</span>
                          <span className="text-white font-bold text-[15px]">Browser</span>
                        </div>
                      </div>
                    </a>
                  )}
                  {gameData.windowsLink && (
                    <a
                      href={gameData.windowsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-underline"
                    >
                      <div className="h-12 w-[130px] flex items-center bg-black rounded-lg border border-white/30 transition-transform duration-200 hover:scale-105 cursor-pointer overflow-hidden">
                        <div className="flex items-center justify-center w-10 h-full">
                          <Monitor className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col justify-center leading-none pr-1">
                          <span className="text-white/60 text-[9px] uppercase tracking-wide">Download for</span>
                          <span className="text-white font-bold text-[15px]">Windows</span>
                        </div>
                      </div>
                    </a>
                  )}
                  {gameData.macLink && (
                    <a
                      href={gameData.macLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-underline"
                    >
                      <div className="h-12 w-[130px] flex items-center bg-black rounded-lg border border-white/30 transition-transform duration-200 hover:scale-105 cursor-pointer overflow-hidden">
                        <div className="flex items-center justify-center w-10 h-full">
                          <Gamepad2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col justify-center leading-none pr-1">
                          <span className="text-white/60 text-[9px] uppercase tracking-wide">Download for</span>
                          <span className="text-white font-bold text-[15px]">MacOS</span>
                        </div>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Play Now CTA */}
            {gameData.playNowButtonLink ? (
              <a
                href={gameData.playNowButtonLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full no-underline"
              >
                <button className="bg-[#96EDD6] text-[#163232] rounded-lg px-8 py-3 text-lg font-bold w-full mt-2 transition-all duration-200 hover:bg-[#163232] hover:text-[#96EDD6] hover:scale-105 shadow-md hover:shadow-xl">
                  Play Now
                </button>
              </a>
            ) : (
              <button
                disabled
                className="bg-gray-400 text-white rounded-lg px-8 py-3 text-lg font-bold w-full mt-2 cursor-not-allowed opacity-70"
              >
                Play Now
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 max-w-4xl">
          {gameData.description?.map((paragraph, index) => (
            <div
              key={index}
              className="text-sm text-white/80 leading-relaxed text-justify mb-4"
              dangerouslySetInnerHTML={{ __html: formatContent(paragraph) }}
            />
          ))}
        </div>

        {/* Detail Content 1 */}
        {gameData.detailContent1 && (
          <div className="mt-8 max-w-4xl">
            <div
              className="text-sm text-white/80 leading-relaxed text-justify"
              dangerouslySetInnerHTML={{ __html: formatContent(gameData.detailContent1) }}
            />
          </div>
        )}

        {/* Second Image */}
        {gameData.imageDetail2Url && (
          <div className="mt-8 max-w-4xl">
            <div className="w-full aspect-video overflow-hidden rounded-2xl bg-[#163232]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gameData.imageDetail2Url}
                alt={`${gameData.title} - Gameplay`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Detail Content 2 */}
        {gameData.detailContent2 && (
          <div className="mt-8 max-w-4xl">
            <div
              className="text-sm text-white/80 leading-relaxed text-justify"
              dangerouslySetInnerHTML={{ __html: formatContent(gameData.detailContent2) }}
            />
          </div>
        )}

        {/* More Games */}
        {moreGames.length > 0 && (
          <div className="mt-12 mb-4">
            <h2 className="text-2xl font-bold mb-6">More Games</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {moreGames.map((game) => (
                <div
                  key={game.id}
                  className="group cursor-pointer rounded-2xl overflow-hidden bg-[#1a1a1a] hover:bg-[#163232] transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => router.push(`/game-details?name=${encodeURIComponent(game.title ?? '')}`)}
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={game.portraitImageUrl || game.imageDetail1Url || '/placeholder-game.png'}
                      alt={game.title ?? 'Game'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {Array.isArray(game.categories) && game.categories.length > 0 && (
                        <span className="text-[10px] bg-[#96EDD6] text-[#102425] rounded-full px-2 py-0.5 font-medium">
                          {game.categories[0]}
                        </span>
                      )}
                      {Array.isArray(game.genres) && game.genres.length > 0 && (
                        <span className="text-[10px] text-white/60">
                          {game.genres[0]}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1 line-clamp-1">
                      {game.title}
                    </h3>
                    {game.tagline && (
                      <p className="text-xs text-white/60 line-clamp-2 mb-2">
                        {game.tagline}
                      </p>
                    )}
                    <button
                      type="button"
                      className="text-xs font-medium text-[#96EDD6] hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/game-details?name=${encodeURIComponent(game.title ?? '')}`)
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacing before footer */}
      <div className="pb-16" />
    </div>
  )
}
