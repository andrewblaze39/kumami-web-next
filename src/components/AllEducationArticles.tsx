'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Clock, Search, ArrowLeft } from 'lucide-react'
import { PHASES } from '@/data/educationPhases'
import { resolveLevelNumber } from '@/lib/educationUtils'

interface Article {
  id: string
  title: string
  level: number | string
  chapterIndex: number
  thumbnail: string
  blurb: string
  minutes: number
}

// Derive level labels and colors from PHASES
const LEVEL_FILTER_OPTIONS = ['All', ...PHASES.map(p => `Level ${p.n}`)]

const LEVEL_COLORS: Record<number, string> = Object.fromEntries(
  PHASES.map(p => [p.n, p.hex])
)

function getLevelColor(level: number | string): string {
  const n = resolveLevelNumber(level)
  return n ? (LEVEL_COLORS[n] ?? 'var(--mint)') : 'var(--mint)'
}

function getLevelLabel(level: number | string): string {
  const n = resolveLevelNumber(level)
  return n ? `Level ${n}` : String(level)
}

export default function AllEducationArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('All')

  useEffect(() => {
    getDocs(collection(db, 'education_articles'))
      .then(snap => {
        const docs = snap.docs
          .map(d => {
            const data = d.data() as Record<string, unknown>
            if (data.status && data.status !== 'published') return null
            return {
              id: d.id,
              title: (data.title as string) || 'Untitled',
              level: data.level as number | string,
              chapterIndex: (data.chapterIndex as number) ?? 0,
              thumbnail: (data.thumbnail as string) || '',
              blurb: (data.blurb as string) || (data.description as string) || '',
              minutes: (data.minutes as number) || (data.readTime as number) || 0,
            } as Article
          })
          .filter((d): d is Article => d !== null)
        setArticles(docs)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = articles.filter(a => {
    let matchLevel = true
    if (levelFilter !== 'All') {
      // Extract the number from "Level N" filter label
      const filterNum = parseInt(levelFilter.replace('Level ', ''))
      matchLevel = resolveLevelNumber(a.level) === filterNum
    }
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.blurb.toLowerCase().includes(q) ||
      getLevelLabel(a.level).toLowerCase().includes(q)
    return matchLevel && matchSearch
  })

  return (
    <div className="edu-content">

      {/* Back */}
      <Link
        href="/education"
        className="edu-btn edu-btn-ghost"
        style={{ marginBottom: 24, alignSelf: 'flex-start', fontSize: 13.5, padding: '8px 14px' }}
      >
        <ArrowLeft size={14} /> Back to Education
      </Link>

      <div className="edu-section-head">
        <h1 className="edu-section-title">All Lessons</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14.5, marginTop: 6 }}>
          {loading ? 'Loading…' : `${articles.length} lessons available`}
        </p>
      </div>

      {/* Search + level filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted-2)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search lessons…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 34px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {LEVEL_FILTER_OPTIONS.map(l => {
            const active = levelFilter === l
            const levelNum = l === 'All' ? null : parseInt(l.replace('Level ', ''))
            const color = levelNum ? LEVEL_COLORS[levelNum] : undefined
            return (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  border: active
                    ? `1.5px solid ${color ?? 'var(--mint)'}`
                    : '1.5px solid var(--border)',
                  background: active ? 'rgba(94,233,168,0.08)' : 'transparent',
                  color: active ? (color ?? 'var(--mint)') : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {l}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '2px solid var(--mint)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'edu-spin 0.8s linear infinite',
            }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 60 }}>
          No lessons found.
        </p>
      ) : (
        <div className="edu-all-grid">
          {filtered.map(article => {
            const color = getLevelColor(article.level)
            return (
              <Link
                key={article.id}
                href={`/education/article/${article.id}`}
                className="edu-all-card"
              >
                {/* Thumbnail */}
                <div
                  className="edu-all-thumb"
                  style={
                    article.thumbnail
                      ? { backgroundImage: `url(${article.thumbnail})` }
                      : {}
                  }
                >
                  {!article.thumbnail && (
                    <div className="edu-all-thumb-empty">📚</div>
                  )}
                </div>

                <div style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {getLevelLabel(article.level)}
                  </span>
                  <h3
                    style={{
                      margin: '6px 0 8px',
                      fontSize: 15,
                      fontWeight: 700,
                      lineHeight: 1.35,
                      color: 'var(--text)',
                    }}
                  >
                    {article.title}
                  </h3>
                  {article.blurb && (
                    <p
                      style={{
                        margin: '0 0 10px',
                        fontSize: 13,
                        color: 'var(--muted)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {article.blurb}
                    </p>
                  )}
                  {article.minutes > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        color: 'var(--muted-2)',
                      }}
                    >
                      <Clock size={11} /> {article.minutes} min
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
