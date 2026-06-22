'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Check, ArrowRight, Play, Clock } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PHASES } from '@/data/educationPhases'
import { resolveLevelNumber, getLevelColor } from '@/lib/educationUtils'
import type { EducationArticle } from '@/types/education'

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  bgGradient: 'linear-gradient(160deg, #0A1A1C 0%, #0D2224 30%, #102425 65%, #0e1d1f 100%)',
  mint: '#96EDD6',
  mintInk: '#102425',
  text: '#FAFAFA',
  textDim: 'rgba(250,250,250,0.55)',
  textFade: 'rgba(250,250,250,0.35)',
  border: 'rgba(150,237,214,0.25)',
  borderLo: 'rgba(255,255,255,0.09)',
}

const CONCEPTS = [
  { id: 'c1', term: 'HODL',            meaning: 'Holding through volatility — born from a typo in 2013.' },
  { id: 'c2', term: 'Gas',             meaning: 'A small fee paid to keep the network running.' },
  { id: 'c3', term: 'Seed phrase',     meaning: '12 words that ARE your wallet — guard them with your life.' },
  { id: 'c4', term: 'DeFi',            meaning: 'Banks, but written in code, open to anyone.' },
  { id: 'c5', term: 'NFT',             meaning: 'Proof you own a specific digital thing.' },
  { id: 'c6', term: 'Smart contract',  meaning: 'Code that runs when conditions are met — no humans needed.' },
]

const CSS_ANIMATIONS = `
  @keyframes eduPeek {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes eduPawL {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-8deg); }
    75% { transform: rotate(3deg); }
  }
  @keyframes eduPawR {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(8deg); }
    75% { transform: rotate(-3deg); }
  }
  @keyframes eduSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes eduFloat {
    0%, 100% { transform: translateX(-50%) translateY(0px); }
    50% { transform: translateX(-50%) translateY(-8px); }
  }
  @keyframes eduFadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes orbDrift {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    33% { transform: translate(calc(-50% + 18px), calc(-50% - 22px)) scale(1.04); }
    66% { transform: translate(calc(-50% - 12px), calc(-50% + 8px)) scale(0.97); }
  }
`

// ── Derived level data from PHASES ────────────────────────────────────────
const LEVELS = PHASES.map(p => ({
  num: p.n,
  name: p.tag,
  color: p.hex,
  blurb: p.blurb,
  outcomes: p.outcomes,
}))

// ── KumaPeek SVG bear ────────────────────────────────────────────────────
function KumaPeek({ size = 260 }: { size?: number }) {
  const white = '#FAFAFA'
  const dark = '#0e1d1f'
  return (
    <svg viewBox="0 0 220 200" width={size} height={size * 0.91} style={{
      filter: 'drop-shadow(0 14px 32px rgba(0,0,0,0.45))',
      animation: 'eduPeek 5s ease-in-out infinite',
      display: 'block',
    }}>
      {/* Ears */}
      <circle cx="62" cy="58" r="18" fill={white}/>
      <circle cx="158" cy="58" r="18" fill={white}/>
      <circle cx="62" cy="58" r="9" fill="#dcdcdc"/>
      <circle cx="158" cy="58" r="9" fill="#dcdcdc"/>
      {/* Left paw */}
      <g style={{ transformOrigin: '32px 170px', animation: 'eduPawL 4s ease-in-out infinite' }}>
        <ellipse cx="32" cy="170" rx="26" ry="36" fill={white}/>
        <ellipse cx="26" cy="152" rx="3.8" ry="5" fill={dark} opacity={0.85}/>
        <ellipse cx="36" cy="150" rx="3.8" ry="5" fill={dark} opacity={0.85}/>
        <ellipse cx="46" cy="156" rx="3.5" ry="4.6" fill={dark} opacity={0.85}/>
        <ellipse cx="32" cy="164" rx="9" ry="8" fill={dark} opacity={0.85}/>
      </g>
      {/* Right paw */}
      <g style={{ transformOrigin: '188px 170px', animation: 'eduPawR 4s ease-in-out infinite' }}>
        <ellipse cx="188" cy="170" rx="26" ry="36" fill={white}/>
        <ellipse cx="184" cy="150" rx="3.8" ry="5" fill={dark} opacity={0.85}/>
        <ellipse cx="194" cy="152" rx="3.8" ry="5" fill={dark} opacity={0.85}/>
        <ellipse cx="174" cy="156" rx="3.5" ry="4.6" fill={dark} opacity={0.85}/>
        <ellipse cx="188" cy="164" rx="9" ry="8" fill={dark} opacity={0.85}/>
      </g>
      {/* Head */}
      <ellipse cx="110" cy="116" rx="72" ry="64" fill={white}/>
      {/* Eyes */}
      <ellipse cx="86" cy="104" rx="4" ry="5.5" fill={dark}>
        <animate attributeName="ry" values="5.5;0.5;5.5;5.5;5.5" keyTimes="0;0.03;0.06;0.6;1" dur="5s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="134" cy="104" rx="4" ry="5.5" fill={dark}>
        <animate attributeName="ry" values="5.5;0.5;5.5;5.5;5.5" keyTimes="0;0.03;0.06;0.6;1" dur="5s" repeatCount="indefinite"/>
      </ellipse>
      {/* Snout */}
      <ellipse cx="110" cy="130" rx="22" ry="14" fill="#f0eee9"/>
      {/* Nose */}
      <path d="M 104 120 Q 110 124 116 120 Q 115 127 110 127.5 Q 105 127 104 120 Z" fill={dark}/>
      {/* Mouth */}
      <path d="M 110 128 L 110 133 M 102 138 Q 110 142 118 138" stroke={dark} strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

// ── Floating orbs background ──────────────────────────────────────────────
const ORB_DEFS = [
  { size: 320, x: '10%',  y: '18%',  color: '#96EDD6', opacity: 0.05, delay: '0s',  dur: '18s' },
  { size: 220, x: '78%',  y: '10%',  color: '#A78BFA', opacity: 0.06, delay: '3s',  dur: '22s' },
  { size: 260, x: '55%',  y: '50%',  color: '#96EDD6', opacity: 0.04, delay: '6s',  dur: '20s' },
  { size: 160, x: '18%',  y: '72%',  color: '#F472B6', opacity: 0.05, delay: '2s',  dur: '25s' },
  { size: 190, x: '86%',  y: '64%',  color: '#5EEAD4', opacity: 0.05, delay: '8s',  dur: '19s' },
  { size: 130, x: '42%',  y: '87%',  color: '#A78BFA', opacity: 0.04, delay: '4s',  dur: '23s' },
]

function FloatingOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {ORB_DEFS.map((o, i) => (
        <div key={i} style={{
          position: 'absolute', left: o.x, top: o.y,
          width: o.size, height: o.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
          opacity: o.opacity,
          animation: `orbDrift ${o.dur} ${o.delay} ease-in-out infinite`,
        }}/>
      ))}
    </div>
  )
}

// ── Interactive level marker ──────────────────────────────────────────────
type LevelEntry = typeof LEVELS[number]

function LevelMarker({
  lv, hovered, onHover, onLeave, mobile,
}: {
  lv: LevelEntry
  idx?: number
  hovered: number | null
  onHover: (n: number) => void
  onLeave: () => void
  mobile?: boolean
}) {
  const isActive = hovered === lv.num
  const isAnyHovered = hovered !== null
  const reached = lv.num <= (hovered ?? 1)

  if (mobile) {
    return (
      <button
        onMouseEnter={() => onHover(lv.num)} onMouseLeave={onLeave}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: 14, borderRadius: 14, textAlign: 'left', width: '100%',
          background: isActive
            ? `linear-gradient(90deg, ${lv.color}1f, transparent)`
            : 'rgba(255,255,255,0.03)',
          border: `1.5px solid ${isActive ? lv.color : 'rgba(255,255,255,0.08)'}`,
          cursor: 'pointer',
          transition: 'all .25s ease',
        }}>
        <span style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: lv.color, color: T.mintInk,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 22, letterSpacing: '-0.04em',
          boxShadow: `0 8px 18px ${lv.color}66`,
        }}>{lv.num}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: lv.color, letterSpacing: '0.08em' }}>
            LEVEL {lv.num}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {lv.name}
          </div>
          <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>{lv.blurb}</div>
        </div>
      </button>
    )
  }

  return (
    <div
      onMouseEnter={() => onHover(lv.num)} onMouseLeave={onLeave}
      style={{
        flex: 1, position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: 'pointer', minWidth: 0, paddingTop: 50,
      }}>
      {/* Marker circle */}
      <div style={{
        position: 'relative', zIndex: 3,
        width: isActive ? 84 : 56, height: isActive ? 84 : 56,
        borderRadius: '50%', background: lv.color, color: T.mintInk,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: isActive ? 32 : 20, letterSpacing: '-0.04em',
        transform: isActive ? 'translateY(-22px)' : 'translateY(0)',
        transition: 'all .35s cubic-bezier(.2,.9,.3,1.3)',
        boxShadow: isActive
          ? `0 16px 38px ${lv.color}aa, 0 0 0 6px ${lv.color}22, 0 0 0 1px ${lv.color}`
          : reached ? `0 6px 14px ${lv.color}55` : '0 4px 10px rgba(0,0,0,0.3)',
        opacity: isAnyHovered && !reached ? 0.4 : 1,
      }}>
        {lv.num}
        {isActive && (
          <span style={{
            position: 'absolute', inset: -10, borderRadius: '50%',
            border: `2px dashed ${lv.color}55`,
            animation: 'eduSpin 12s linear infinite',
          }}/>
        )}
      </div>

      {/* Text block */}
      <div style={{
        marginTop: 18, textAlign: 'center', minHeight: 110,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: lv.color, letterSpacing: '0.12em' }}>
          LEVEL {String(lv.num).padStart(2, '0')}
        </div>
        <div style={{
          fontSize: isActive ? 22 : 19, fontWeight: 900, color: '#fff',
          letterSpacing: '-0.025em', lineHeight: 1.05,
          transition: 'font-size .3s cubic-bezier(.2,.9,.3,1.3)',
        }}>{lv.name}</div>
        <div style={{
          fontSize: 12, color: T.textDim, lineHeight: 1.45, maxWidth: 180,
          opacity: isActive ? 1 : 0.7, transition: 'opacity .25s ease',
        }}>{lv.blurb}</div>

        {/* Outcomes expand on hover (from PHASES) */}
        <div style={{
          maxHeight: isActive ? 140 : 0, opacity: isActive ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height .35s ease, opacity .25s ease',
          marginTop: isActive ? 6 : 0,
        }}>
          <div style={{
            padding: '10px 14px', borderRadius: 12,
            background: `${lv.color}14`, border: `1px solid ${lv.color}55`,
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {lv.outcomes.slice(0, 3).map((o, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: T.textDim, textAlign: 'left',
              }}>
                <Check size={10} style={{ color: lv.color, flexShrink: 0 }}/>
                <span>{o}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Lesson card ───────────────────────────────────────────────────────────
function LessonCard({ article, i }: { article: EducationArticle; i: number }) {
  const [hover, setHover] = useState(false)
  const levelNum = resolveLevelNumber(article.level)
  const levelColor = levelNum ? getLevelColor(levelNum) : T.mint

  return (
    <Link
      href={`/education/article/${article.id}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${hover ? T.mint + '55' : T.borderLo}`,
        background: 'rgba(255,255,255,0.03)',
        transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s ease',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hover ? '0 20px 40px rgba(0,0,0,0.4)' : 'none',
        animation: `eduFadeUp .5s cubic-bezier(.2,.9,.3,1.1) ${1.5 + i * 0.08}s both`,
        textDecoration: 'none', color: 'inherit', display: 'block',
      }}>
      {/* Thumbnail */}
      <div style={{
        aspectRatio: '3/2', position: 'relative',
        backgroundImage: article.thumbnail ? `url(${article.thumbnail})` : 'linear-gradient(135deg, #1a2e30, #102425)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.5))',
        }}/>
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <span style={{
            padding: '4px 10px', borderRadius: 999,
            background: levelColor, color: T.mintInk,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
          }}>
            {levelNum ? `Level ${levelNum}` : String(article.level)}
          </span>
        </div>
        {article.minutes > 0 && (
          <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 999,
              background: 'rgba(0,0,0,0.6)', color: T.textDim,
              fontSize: 10, fontWeight: 600,
            }}>
              <Clock size={9}/> {article.minutes} min
            </span>
          </div>
        )}
      </div>
      {/* Content */}
      <div style={{ padding: 14 }}>
        <div style={{
          fontSize: 15, fontWeight: 800, color: '#fff',
          letterSpacing: '-0.015em', marginBottom: 6, lineHeight: 1.3,
        }}>{article.title}</div>
        {article.blurb ? (
          <div style={{
            fontSize: 12, color: T.textDim, lineHeight: 1.45, marginBottom: 10,
          }}>{article.blurb}</div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: 11, fontWeight: 800, color: T.mint, letterSpacing: '0.04em',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>READ <ArrowRight size={11}/></span>
        </div>
      </div>
    </Link>
  )
}

// ── Concept card ─────────────────────────────────────────────────────────
function ConceptCard({ c, i }: { c: typeof CONCEPTS[number]; i: number }) {
  return (
    <div style={{
      flex: '0 0 240px', scrollSnapAlign: 'start',
      padding: '18px 16px', borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(150,237,214,0.10), rgba(150,237,214,0.02))',
      border: `1px solid ${T.border}`,
      animation: `eduFadeUp .5s cubic-bezier(.2,.9,.3,1.1) ${0.7 + i * 0.05}s both`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: T.mint, letterSpacing: '0.1em', marginBottom: 8 }}>
        TERM #{String(i + 1).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', marginBottom: 6 }}>
        {c.term}
      </div>
      <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.45 }}>
        {c.meaning}
      </div>
    </div>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.borderLo}`,
    }}>
      <div style={{ height: 140, background: 'rgba(255,255,255,0.06)' }}/>
      <div style={{ padding: 14 }}>
        <div style={{ height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 8 }}/>
        <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '70%' }}/>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function EducationGrid() {
  const router = useRouter()
  const [hovered, setHovered] = useState<number | null>(null)
  const [searchTerm, setSearch] = useState('')
  const [articles, setArticles] = useState<EducationArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'education_articles'))
        const docs = snapshot.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>
            if (data.status && data.status !== 'published') return null
            const createdAtRaw = data.createdAt as { toMillis?: () => number } | undefined
            return {
              id: d.id,
              title: (data.title as string) || 'Untitled Lesson',
              level: data.level as number | string,
              chapterIndex: (data.chapterIndex as number) ?? 0,
              thumbnail: (data.thumbnail as string) || '',
              featured: (data.featured as boolean) || false,
              blurb: (data.blurb as string) || (data.description as string) || '',
              minutes: (data.minutes as number) || (data.readTime as number) || 0,
              author: (data.author as string) || '',
              sections: (data.sections as EducationArticle['sections']) || [],
              status: 'published' as const,
              description: (data.description as string) || '',
              createdAt: createdAtRaw?.toMillis ? createdAtRaw.toMillis() : 0,
            } as EducationArticle & { createdAt: number }
          })
          .filter((d): d is EducationArticle & { createdAt: number } => d !== null)
        setArticles(docs)
      } catch (err) {
        console.error('Error loading education articles:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [])

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return articles
    const q = searchTerm.toLowerCase()
    const lvLabel = (a: EducationArticle) => {
      const n = resolveLevelNumber(a.level)
      return n ? `level ${n}` : String(a.level).toLowerCase()
    }
    return articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.blurb.toLowerCase().includes(q) ||
      lvLabel(a).includes(q)
    )
  }, [articles, searchTerm])

  // Featured articles sorted by level then chapterIndex
  const featured = useMemo(() => {
    return filtered
      .filter(a => a.featured === true)
      .sort((a, b) => {
        const la = resolveLevelNumber(a.level) ?? 99
        const lb = resolveLevelNumber(b.level) ?? 99
        if (la !== lb) return la - lb
        return (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0)
      })
  }, [filtered])

  const displayedLessons = featured.length > 0 ? featured : filtered

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_ANIMATIONS }}/>
      <div style={{
        width: '100%', minHeight: '100vh',
        background: T.bgGradient, color: T.text,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        position: 'relative', overflow: 'auto',
      }}>
        <FloatingOrbs/>

        <div style={{
          position: 'relative', maxWidth: 1280, margin: '0 auto',
          padding: mobile ? '24px 16px 48px' : '40px 36px 70px',
          zIndex: 1,
        }}>

          {/* ── HERO ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '1fr auto',
            gap: mobile ? 16 : 32,
            alignItems: 'flex-end',
            marginBottom: mobile ? 20 : 32,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ animation: 'eduFadeUp .5s ease both' }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: T.mint,
                }}>◇ KUMAMI EDUCATION · FREE FOREVER</span>
              </div>
              <h1 style={{
                margin: '6px 0 0',
                fontSize: mobile ? 40 : 62,
                fontWeight: 900, color: T.text,
                letterSpacing: '-0.035em', lineHeight: 0.96,
                animation: 'eduFadeUp .6s cubic-bezier(.2,.9,.3,1.1) .15s both',
              }}>
                Start your{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #96EDD6, #A78BFA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>crypto journey</span>
              </h1>
              <p style={{
                margin: '14px 0 0',
                fontSize: mobile ? 14 : 17,
                color: T.textDim, lineHeight: 1.55, maxWidth: 520,
                animation: 'eduFadeUp .6s cubic-bezier(.2,.9,.3,1.1) .25s both',
              }}>
                No prior knowledge needed. Hover any level below to peek at what you&apos;ll learn — then jump in wherever feels right.
              </p>
              <div style={{
                marginTop: mobile ? 18 : 22,
                display: 'flex', gap: 10, flexWrap: 'wrap',
                animation: 'eduFadeUp .6s cubic-bezier(.2,.9,.3,1.1) .35s both',
              }}>
                <button
                  onClick={() => { router.push('/education/1') }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 22px', borderRadius: 12,
                    background: T.mint, color: T.mintInk,
                    fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
                  }}>
                  <Play size={13} fill={T.mintInk}/> Start Level 1
                </button>
                <button onClick={() => {
                  document.getElementById('edu-featured')?.scrollIntoView({ behavior: 'smooth' })
                }} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 22px', borderRadius: 12,
                  background: 'transparent', color: T.text,
                  border: `1.5px solid ${T.borderLo}`,
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}>
                  Browse all <ArrowRight size={13}/>
                </button>
              </div>
            </div>
            {!mobile && (
              <div style={{
                flexShrink: 0,
                animation: 'eduFadeUp .7s cubic-bezier(.2,.9,.3,1.1) .1s both',
                marginBottom: -20,
              }}>
                <KumaPeek size={300}/>
              </div>
            )}
          </div>

          {/* ── SEARCH ── */}
          <div style={{
            marginBottom: mobile ? 24 : 28,
            animation: 'eduFadeUp .6s cubic-bezier(.2,.9,.3,1.1) .4s both',
          }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search lessons..."
                value={searchTerm}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '14px 48px 14px 18px',
                  borderRadius: 12, border: `1.5px solid ${T.borderLo}`,
                  background: 'rgba(255,255,255,0.06)', color: T.text,
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <Search size={18} style={{
                position: 'absolute', right: 16, top: '50%',
                transform: 'translateY(-50%)', color: T.textFade, pointerEvents: 'none',
              }}/>
            </div>
          </div>

          {/* ── INTERACTIVE JOURNEY ── */}
          <div style={{ marginBottom: mobile ? 28 : 48 }}>
            <div style={{ marginBottom: 24, animation: 'eduFadeUp .6s ease .6s both' }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: T.mint,
              }}>◇ THE JOURNEY</span>
              <h2 style={{
                margin: '6px 0 0',
                fontSize: mobile ? 28 : 36,
                fontWeight: 900, letterSpacing: '-0.025em', color: T.text,
              }}>5 levels. Hover to peek.</h2>
              <div style={{ fontSize: 14, color: T.textDim, marginTop: 6 }}>
                Move along the path — each marker rises like you&apos;re stepping onto it.
              </div>
            </div>

            {mobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {LEVELS.map((lv, i) => (
                  <LevelMarker key={lv.num} lv={lv} idx={i}
                    hovered={hovered} onHover={setHovered} onLeave={() => setHovered(null)}
                    mobile/>
                ))}
              </div>
            ) : (
              <div style={{ position: 'relative', padding: '0 12px' }}>
                {/* Background dashed line */}
                <div style={{
                  position: 'absolute', top: 50 + 28,
                  left: '8%', right: '8%', height: 2,
                  background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 8px, transparent 8px 14px)',
                  zIndex: 1,
                }}/>
                {/* Solid progress line */}
                <div style={{
                  position: 'absolute', top: 50 + 28, left: '8%', height: 3, borderRadius: 2,
                  width: `${(((hovered ?? 1) - 1) / (LEVELS.length - 1)) * 84}%`,
                  background: 'linear-gradient(90deg, #86EFAC, #5EEAD4, #96EDD6, #A78BFA, #F472B6)',
                  boxShadow: hovered
                    ? `0 0 16px ${LEVELS.find(l => l.num === hovered)?.color ?? T.mint}88`
                    : 'none',
                  zIndex: 2,
                  transition: 'width .4s cubic-bezier(.2,.9,.3,1.3), box-shadow .3s ease',
                }}/>
                {/* Level markers */}
                <div style={{
                  position: 'relative', zIndex: 3,
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  {LEVELS.map((lv, i) => (
                    <LevelMarker key={lv.num} lv={lv} idx={i}
                      hovered={hovered} onHover={setHovered} onLeave={() => setHovered(null)}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── WARMUP TERMS ── */}
          <div style={{ marginBottom: mobile ? 28 : 40 }}>
            <div style={{ marginBottom: 14 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#A78BFA',
              }}>◇ WARMUP</span>
              <h2 style={{
                margin: '6px 0 0',
                fontSize: mobile ? 22 : 28,
                fontWeight: 800, letterSpacing: '-0.02em', color: T.text,
              }}>Crypto terms in plain English</h2>
            </div>
            <div style={{
              display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
              scrollSnapType: 'x mandatory',
            }}>
              {CONCEPTS.map((c, i) => <ConceptCard key={c.id} c={c} i={i}/>)}
            </div>
          </div>

          {/* ── FEATURED LESSONS ── */}
          <div id="edu-featured">
            <div style={{
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
              gap: 12, marginBottom: 16,
            }}>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: T.mint,
                }}>◇ HAND-PICKED</span>
                <h2 style={{
                  margin: '6px 0 0',
                  fontSize: mobile ? 22 : 28,
                  fontWeight: 800, letterSpacing: '-0.02em', color: T.text,
                }}>Featured lessons</h2>
              </div>
              <button
                onClick={() => router.push('/education/all')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 10,
                  border: `1px solid ${T.borderLo}`, background: 'transparent',
                  color: T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                All lessons <ArrowRight size={12}/>
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 14,
            }}>
              {loading
                ? Array.from({ length: mobile ? 2 : 6 }).map((_, i) => <SkeletonCard key={i}/>)
                : displayedLessons.slice(0, mobile ? 4 : 6).map((a, i) => (
                    <LessonCard key={a.id} article={a} i={i}/>
                  ))
              }
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
