'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { Search, ChevronRight, ChevronLeft, Play, Info } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  bgGradient: 'linear-gradient(160deg, #05080A 0%, #0A1518 30%, #0D1E20 65%, #0b1a1c 100%)',
  mint: '#96EDD6',
  mintInk: '#102425',
  text: '#FAFAFA',
  textDim: 'rgba(250,250,250,0.55)',
  textFade: 'rgba(250,250,250,0.35)',
  border: 'rgba(150,237,214,0.2)',
  borderLo: 'rgba(255,255,255,0.09)',
}

const TYPE_COLOR: Record<string, string> = {
  'Workshop':   '#A78BFA',
  'Submission': '#5EEAD4',
  'Playground': '#FACC15',
}

const CSS_ANIMATIONS = `
  @keyframes aimFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes aimOrbDrift {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    33% { transform: translate(calc(-50% + 20px), calc(-50% - 25px)) scale(1.04); }
    66% { transform: translate(calc(-50% - 14px), calc(-50% + 10px)) scale(0.97); }
  }
`

const ORB_DEFS = [
  { size: 400, x: '15%',  y: '20%',  color: '#96EDD6', opacity: 0.04, delay: '0s',  dur: '20s' },
  { size: 280, x: '80%',  y: '12%',  color: '#A78BFA', opacity: 0.05, delay: '4s',  dur: '24s' },
  { size: 320, x: '60%',  y: '55%',  color: '#5EEAD4', opacity: 0.03, delay: '7s',  dur: '18s' },
  { size: 200, x: '20%',  y: '75%',  color: '#FACC15', opacity: 0.04, delay: '2s',  dur: '26s' },
  { size: 240, x: '88%',  y: '70%',  color: '#96EDD6', opacity: 0.04, delay: '9s',  dur: '21s' },
]

// ── Types ─────────────────────────────────────────────────────────────────
interface AIModule {
  id: string
  title: string
  tagline: string
  thumbnail: string
  featured: boolean
  type: string   // 'Workshop' | 'Submission' | 'Playground' | ''
  level: string
}

// ── Floating orbs ─────────────────────────────────────────────────────────
function FloatingOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {ORB_DEFS.map((o, i) => (
        <div key={i} style={{
          position: 'absolute', left: o.x, top: o.y,
          width: o.size, height: o.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
          opacity: o.opacity,
          animation: `aimOrbDrift ${o.dur} ${o.delay} ease-in-out infinite`,
        }}/>
      ))}
    </div>
  )
}

// ── Type pill badge ────────────────────────────────────────────────────────
function TypePill({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' }) {
  const color = TYPE_COLOR[type] || T.mint
  const isMd = size === 'md'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: isMd ? '5px 12px' : '3px 8px',
      borderRadius: 999,
      background: `${color}22`, border: `1px solid ${color}55`,
      color, fontSize: isMd ? 11 : 10, fontWeight: 800,
      letterSpacing: '0.06em',
    }}>{type || 'Module'}</span>
  )
}

// ── Level chip ────────────────────────────────────────────────────────────
function LevelChip({ level }: { level: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 999,
      background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(255,255,255,0.12)`,
      color: T.textDim, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
    }}>{level}</span>
  )
}

// ── Spotlight hero ────────────────────────────────────────────────────────
function Spotlight({
  featured, current, onChange,
}: {
  featured: AIModule[]
  current: number
  onChange: (i: number) => void
}) {
  const m = featured[current]
  if (!m) return null

  return (
    <div style={{
      position: 'relative', borderRadius: 20, overflow: 'hidden',
      minHeight: 480, border: `1px solid ${T.borderLo}`, background: '#000',
    }}>
      {/* Background layers cycling */}
      {featured.map((f, i) => (
        <div key={f.id} style={{
          position: 'absolute', inset: 0,
          backgroundImage: f.thumbnail ? `url(${f.thumbnail})` : undefined,
          background: f.thumbnail ? undefined : 'linear-gradient(135deg, #1a2a2c, #0d1e20)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === current ? 1 : 0,
          transition: 'opacity .8s ease',
          transform: i === current ? 'scale(1.04)' : 'scale(1)',
          transitionProperty: 'opacity, transform',
          transitionDuration: '8s, 1s',
          zIndex: i === current ? 1 : 0,
        }}/>
      ))}
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: `
          radial-gradient(circle at 30% 70%, rgba(150,237,214,0.12), transparent 60%),
          linear-gradient(0deg, rgba(5,8,10,0.95) 0%, rgba(5,8,10,0.5) 40%, rgba(5,8,10,0.2) 100%)
        `,
      }}/>
      {/* Content */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        padding: '36px 40px',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}>
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{
            padding: '5px 12px', borderRadius: 999,
            background: 'rgba(150,237,214,0.20)', border: `1px solid ${T.mint}55`,
            color: T.mint, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.mint, boxShadow: `0 0 8px ${T.mint}` }}/>
            FEATURED
          </span>
          {m.type && <TypePill type={m.type} size="md"/>}
          {m.level && <LevelChip level={m.level}/>}
        </div>
        {/* Title */}
        <h1 style={{
          margin: 0, fontSize: 64, fontWeight: 900, color: '#fff',
          letterSpacing: '-0.04em', lineHeight: 0.92, maxWidth: 680,
          textShadow: '0 8px 40px rgba(0,0,0,0.7)',
        }}>{m.title}</h1>
        {m.tagline && (
          <p style={{
            margin: '16px 0 0', fontSize: 17, color: T.textDim, maxWidth: 560,
            lineHeight: 1.5, fontWeight: 500,
          }}>{m.tagline}</p>
        )}
        {/* CTAs */}
        <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 24px', borderRadius: 12,
            background: T.mint, color: T.mintInk,
            fontWeight: 800, fontSize: 15, cursor: 'pointer', border: 'none',
          }}>
            <Play size={14} fill={T.mintInk}/> Explore
          </button>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.1)', color: T.text,
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            border: `1px solid ${T.borderLo}`,
          }}>
            <Info size={14}/> Details
          </button>
        </div>
        {/* Pagination dots */}
        <div style={{
          position: 'absolute', right: 40, bottom: 36, display: 'flex', gap: 6,
        }}>
          {featured.map((_, i) => (
            <button key={i} onClick={() => onChange(i)} style={{
              width: i === current ? 28 : 8, height: 8,
              borderRadius: 4, border: 'none', padding: 0,
              background: i === current ? T.mint : 'rgba(255,255,255,0.25)',
              cursor: 'pointer', transition: 'all .3s ease',
            }}/>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Shelf (horizontal scrollable row) ────────────────────────────────────
const chevBtn: CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  border: `1px solid rgba(255,255,255,0.1)`, background: 'rgba(0,0,0,0.4)',
  color: '#fff', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

function Shelf({
  title, eyebrow, items, accentColor,
}: {
  title: string
  eyebrow: string
  items: AIModule[]
  accentColor?: string
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const accent = accentColor ?? T.mint

  const scroll = (dir: number) => {
    scrollerRef.current?.scrollBy({ left: dir * 340, behavior: 'smooth' })
  }

  if (items.length === 0) return null

  return (
    <div>
      {/* Shelf header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 16, marginBottom: 14,
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: accent, marginBottom: 4,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: accent,
              boxShadow: `0 0 8px ${accent}`,
            }}/>
            {eyebrow}
          </div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {title}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => scroll(-1)} style={chevBtn}>
            <ChevronLeft size={14}/>
          </button>
          <button onClick={() => scroll(1)} style={chevBtn}>
            <ChevronRight size={14}/>
          </button>
        </div>
      </div>
      {/* Scrollable row */}
      <div ref={scrollerRef} style={{
        display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
        scrollSnapType: 'x mandatory',
      }}>
        {items.map(m => <ShelfCard key={m.id} m={m} accentColor={accent}/>)}
      </div>
    </div>
  )
}

// ── Shelf card ────────────────────────────────────────────────────────────
function ShelfCard({ m, accentColor }: { m: AIModule; accentColor: string }) {
  const [hover, setHover] = useState(false)
  const router = useRouter()

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => router.push(`/ai-labs/module/${m.id}`)}
      style={{
        flex: '0 0 280px', scrollSnapAlign: 'start',
        borderRadius: 12, overflow: 'hidden',
        background: '#000', cursor: 'pointer',
        transition: 'transform .25s ease, box-shadow .25s ease',
        transform: hover ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hover
          ? `0 24px 40px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}55`
          : 'none',
        border: `1px solid ${T.borderLo}`,
      }}>
      {/* Thumbnail */}
      <div style={{
        position: 'relative', aspectRatio: '16/10',
        backgroundImage: m.thumbnail ? `url(${m.thumbnail})` : undefined,
        background: m.thumbnail ? undefined : 'linear-gradient(135deg, #1a2a2c, #0d1e20)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.75))',
        }}/>
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          {m.type && <TypePill type={m.type}/>}
        </div>
        {m.level && (
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <LevelChip level={m.level}/>
          </div>
        )}
      </div>
      {/* Card body */}
      <div style={{ padding: '12px 14px 14px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: '#fff',
          letterSpacing: '-0.01em', marginBottom: 5,
        }}>{m.title}</div>
        {m.tagline && (
          <div style={{
            fontSize: 12, color: T.textDim, lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{m.tagline}</div>
        )}
      </div>
    </div>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────
function SkeletonShelfCard() {
  return (
    <div style={{
      flex: '0 0 280px', borderRadius: 12, overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.borderLo}`,
    }}>
      <div style={{ aspectRatio: '16/10', background: 'rgba(255,255,255,0.06)' }}/>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 8 }}/>
        <div style={{ height: 11, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '70%' }}/>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function AIModulesGrid() {
  const [searchTerm, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [modules, setModules] = useState<AIModule[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'ai_modules'))
        const docs = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Record<string, unknown>
            if (data.status === 'draft') return null
            return {
              id: doc.id,
              title: (data.title as string) || 'Untitled Module',
              tagline: (data.tagline as string) || (data.description as string) || '',
              thumbnail: (data.thumbnail as string) || (data.landscapeImageUrl as string) || '',
              featured: (data.featured as boolean) || false,
              type: (data.type as string) || (data.moduleType as string) || '',
              level: (data.level as string) || '',
            } as AIModule
          })
          .filter((d): d is AIModule => d !== null)
        setModules(docs)
      } catch (err) {
        console.error('Error loading AI modules:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchModules()
  }, [])

  // Auto-advance spotlight
  useEffect(() => {
    const featuredModules = modules.filter(m => m.featured)
    if (featuredModules.length === 0) return
    const t = setInterval(() => setCurrent(c => (c + 1) % featuredModules.length), 7000)
    return () => clearInterval(t)
  }, [modules])

  const filter = useMemo(() => (list: AIModule[]) => {
    return list.filter(m => {
      if (typeFilter !== 'All' && m.type && m.type !== typeFilter) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        return m.title.toLowerCase().includes(q) ||
               m.tagline.toLowerCase().includes(q) ||
               m.level.toLowerCase().includes(q)
      }
      return true
    })
  }, [typeFilter, searchTerm])

  const featured    = useMemo(() => filter(modules.filter(m => m.featured)), [modules, filter])
  const workshops   = useMemo(() => filter(modules.filter(m => m.type === 'Workshop')), [modules, filter])
  const submissions = useMemo(() => filter(modules.filter(m => m.type === 'Submission')), [modules, filter])
  const playground  = useMemo(() => filter(modules.filter(m => m.type === 'Playground')), [modules, filter])
  const allModules  = useMemo(() => filter(modules), [modules, filter])

  // Determine which type filters to show
  const hasTypedModules = modules.some(m => m.type)
  const typeOptions = hasTypedModules
    ? ['All', 'Workshop', 'Submission', 'Playground']
    : ['All']

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
          padding: mobile ? '18px 16px 40px' : '28px 32px 60px',
          zIndex: 1,
        }}>

          {/* ── MASTHEAD ── */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            gap: 16, marginBottom: 20,
            flexWrap: mobile ? 'wrap' : 'nowrap',
          }}>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: T.mint, marginBottom: 4,
              }}>◇ KUMAMI AI LABS · MODULES</div>
              <h1 style={{
                margin: 0,
                fontSize: mobile ? 28 : 36,
                fontWeight: 800, color: T.text,
                letterSpacing: '-0.025em', lineHeight: 1,
                animation: 'aimFadeUp .5s ease both',
              }}>Explore AI modules</h1>
            </div>
            {!mobile && (
              <div style={{ minWidth: 320, maxWidth: 440, flex: 1 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={searchTerm}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 44px 12px 16px',
                      borderRadius: 12, border: `1.5px solid ${T.borderLo}`,
                      background: 'rgba(255,255,255,0.06)', color: T.text,
                      fontSize: 14, outline: 'none', boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                  <Search size={16} style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)', color: T.textFade, pointerEvents: 'none',
                  }}/>
                </div>
              </div>
            )}
          </div>

          {/* Mobile search */}
          {mobile && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={searchTerm}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 44px 12px 16px',
                    borderRadius: 12, border: `1.5px solid ${T.borderLo}`,
                    background: 'rgba(255,255,255,0.06)', color: T.text,
                    fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <Search size={16} style={{
                  position: 'absolute', right: 14, top: '50%',
                  transform: 'translateY(-50%)', color: T.textFade, pointerEvents: 'none',
                }}/>
              </div>
            </div>
          )}

          {/* ── TYPE FILTER ── */}
          {typeOptions.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {typeOptions.map(opt => {
                const isActive = typeFilter === opt
                const color = opt === 'All' ? T.mint : (TYPE_COLOR[opt] ?? T.mint)
                return (
                  <button key={opt} onClick={() => setTypeFilter(opt)} style={{
                    padding: '8px 18px', borderRadius: 999,
                    background: isActive ? `${color}22` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isActive ? color : T.borderLo}`,
                    color: isActive ? color : T.textDim,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    transition: 'all .2s ease',
                  }}>{opt}</button>
                )
              })}
            </div>
          )}

          {/* ── SPOTLIGHT ── */}
          {loading ? (
            <div style={{
              borderRadius: 20, minHeight: 480,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.borderLo}`,
              marginBottom: 36,
            }}/>
          ) : featured.length > 0 ? (
            <div style={{ marginBottom: 36 }}>
              <Spotlight
                featured={featured}
                current={current % featured.length}
                onChange={setCurrent}
              />
            </div>
          ) : null}

          {/* ── SHELVES ── */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {[1, 2].map(i => (
                <div key={i}>
                  <div style={{ height: 20, background: 'rgba(255,255,255,0.06)', borderRadius: 4, width: 200, marginBottom: 16 }}/>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[1, 2, 3, 4].map(j => <SkeletonShelfCard key={j}/>)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {featured.length > 0 && (
                <Shelf
                  title="Featured modules"
                  eyebrow="Hand-picked"
                  items={featured}
                  accentColor={T.mint}
                />
              )}
              {workshops.length > 0 && (
                <Shelf
                  title="Workshops"
                  eyebrow="Hands-on learning"
                  items={workshops}
                  accentColor={TYPE_COLOR['Workshop']}
                />
              )}
              {submissions.length > 0 && (
                <Shelf
                  title="Submissions"
                  eyebrow="Build & submit"
                  items={submissions}
                  accentColor={TYPE_COLOR['Submission']}
                />
              )}
              {playground.length > 0 && (
                <Shelf
                  title="Playground"
                  eyebrow="Experiment freely"
                  items={playground}
                  accentColor={TYPE_COLOR['Playground']}
                />
              )}
              <Shelf
                title="Full module library"
                eyebrow="All modules"
                items={allModules}
                accentColor={T.mint}
              />
            </div>
          )}

          {/* Empty state */}
          {!loading && allModules.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              color: T.textDim, fontSize: 16,
            }}>
              {modules.length === 0
                ? 'AI modules are being loaded. Check back soon.'
                : 'No modules match your search.'}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
