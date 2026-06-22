'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  BookOpen,
  Clock,
  Trophy,
  Play,
  Check,
  ChevronDown,
  ArrowRight,
} from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PHASES } from '@/data/educationPhases'
import { resolveLevelNumber } from '@/lib/educationUtils'
import type { EducationArticle } from '@/types/education'
import { useEducationProgress } from '@/hooks/useEducationProgress'

interface Props {
  params: Promise<{ phase: string }>
}

// Fetch published articles for a level, keyed by chapterIndex
async function fetchArticlesForLevel(levelNum: number): Promise<Map<number, EducationArticle>> {
  try {
    const q = query(
      collection(db, 'education_articles'),
      where('level', '==', levelNum),
      where('status', '==', 'published')
    )
    const snap = await getDocs(q)
    const map = new Map<number, EducationArticle>()
    snap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>
      const ci = data.chapterIndex as number | undefined
      if (ci === undefined || ci === null) return
      if (!map.has(ci)) {
        map.set(ci, { id: d.id, ...data } as EducationArticle)
      }
    })
    return map
  } catch {
    return new Map()
  }
}

export default function CoursePage({ params }: Props) {
  const { phase } = use(params)
  const levelNum = parseInt(phase)
  const levelData = PHASES.find(p => p.n === levelNum)
  if (!levelData) notFound()

  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'instructor' | 'faq'>('overview')
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set([0]))
  const [articleMap, setArticleMap] = useState<Map<number, EducationArticle>>(new Map())

  // Derive sorted chapter list from Firestore articles
  const chapters = Array.from(articleMap.values()).sort((a, b) => a.chapterIndex - b.chapterIndex)

  const { isChapterComplete, getChapterSectionProgress } = useEducationProgress(levelNum)

  // Calculate progress based on sections completed across all chapters (from Firestore)
  const totalSections = chapters.reduce((sum, a) => sum + (a.sections?.length ?? 0), 0)
  const completedSections = chapters.reduce((sum, a) => sum + getChapterSectionProgress(a.chapterIndex).length, 0)
  const doneCh = chapters.filter(a => isChapterComplete(a.chapterIndex)).length
  const pct = totalSections > 0
    ? Math.round((completedSections / totalSections) * 100)
    : 0

  useEffect(() => {
    fetchArticlesForLevel(levelNum).then(setArticleMap)
  }, [levelNum])

  function toggleChapter(i: number) {
    setOpenChapters(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const TABS = [
    { id: 'overview',    label: 'Overview' },
    { id: 'details',     label: 'Details' },
    { id: 'instructor',  label: 'Instructor' },
    { id: 'faq',         label: 'FAQ' },
  ] as const

  return (
    <div className="edu-content">

      {/* ── COURSE HERO ── */}
      <div
        className="edu-phero"
        style={{ '--c': levelData.hex } as React.CSSProperties}
      >
        <div className="edu-phero-glow" />
        <div className="edu-phero-grid">
          <div>
            <span
              className="edu-lv-tag"
              style={{ color: levelData.hex, fontSize: 12 }}
            >
              Level {levelData.n} · {levelData.tag}
            </span>
            <h1>{levelData.title}</h1>
            <p style={{ color: 'var(--muted)', fontSize: 15, margin: '4px 0 0' }}>
              {levelData.blurb}
            </p>
            <div className="edu-pmeta">
              <span className="edu-pill">
                <BookOpen size={12} /> {chapters.length} chapters
              </span>
              <span className="edu-pill">
                <Clock size={12} /> {levelData.hours}
              </span>
              <span className="edu-pill">
                <Trophy size={12} /> Badge: {levelData.badge}
              </span>
              <span className="edu-pill-free">Free</span>
            </div>
          </div>

          <div className="edu-phero-side">
            <div className="edu-pc" style={{ color: levelData.hex }}>
              {pct}%
            </div>
            <div className="edu-pcl">
              {completedSections} of {totalSections} sections complete
            </div>
            <div className="edu-progress" style={{ width: 160, marginBottom: 16 }}>
              <i style={{ width: `${pct}%`, background: levelData.hex }} />
            </div>
            <Link
              href={`/education/${levelData.n}/0`}
              className="edu-btn edu-btn-primary"
              style={{ background: levelData.hex, color: '#06241a' }}
            >
              <Play size={14} fill="#06241a" />
              Start course
            </Link>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div
        className="edu-tabs"
        style={{ '--c': levelData.hex } as React.CSSProperties}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            className={`edu-tab${activeTab === t.id ? ' edu-tab-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div>
          <div className="edu-ch-intro">
            <h2>Course content</h2>
            <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>
              {chapters.length} chapters · {levelData.hours}
            </span>
          </div>

          {chapters.map((article) => {
            const ci = article.chapterIndex
            const title = article.title
            const isComingSoon = article.comingSoon === true || (article.sections?.length === 0)
            const chapterDone = isChapterComplete(ci)
            const status = chapterDone ? 'done' : ci === doneCh ? 'current' : 'upcoming'
            const isOpen = openChapters.has(ci)
            const chapterHref = isComingSoon
              ? `/education/${levelData.n}/${ci}`
              : `/education/article/${article.id}`

            return (
              <div key={ci} className="edu-chapter">
                <div
                  className="edu-ch-head"
                  onClick={() => toggleChapter(ci)}
                >
                  {/* Chapter number / status */}
                  <div
                    className={`edu-ch-no ${
                      status === 'done'
                        ? 'edu-ch-no-done'
                        : status === 'current'
                        ? 'edu-ch-no-current'
                        : ''
                    }`}
                    style={
                      status === 'current'
                        ? ({ background: levelData.hex, color: '#06241a' } as React.CSSProperties)
                        : {}
                    }
                  >
                    {status === 'done' ? <Check size={13} /> : ci + 1}
                  </div>

                  <div className="edu-ch-title">
                    <span>{title}</span>
                    <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {isComingSoon ? (
                        <span style={{ color: '#a78bfa' }}>Coming soon</span>
                      ) : (
                        <>
                          {article.sections?.length > 0 && (() => {
                            const visited = getChapterSectionProgress(ci).length
                            const total = article.sections.length
                            return (
                              <span>⏱ {visited}/{total} sections</span>
                            )
                          })()}
                          {article.minutes ? (
                            <span>⏰ {article.minutes}m</span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronDown
                    size={16}
                    style={{
                      color: 'var(--muted-2)',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                    }}
                  />
                </div>

                {/* Expandable body */}
                {isOpen && (
                  <div className="edu-ch-body">
                    {isComingSoon ? (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 12,
                          color: '#a78bfa',
                          padding: '6px 12px',
                          border: '1px solid rgba(167, 139, 250, 0.25)',
                          background: 'rgba(167, 139, 250, 0.07)',
                          borderRadius: 8,
                        }}
                      >
                        Content coming soon
                      </span>
                    ) : (
                      <>
                        {article.blurb && (
                          <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 12px' }}>
                            {article.blurb}
                          </p>
                        )}

                        {/* Section list */}
                        {article.sections && article.sections.length > 0 && (() => {
                          const visitedSections = getChapterSectionProgress(ci)
                          return (
                            <div style={{ marginBottom: 14 }}>
                              {article.sections.map((section, si) => {
                                const sectionDone = visitedSections.includes(si)
                                return (
                                  <div key={si} className="edu-part">
                                    <div className={`edu-pdot${sectionDone ? ' edu-pdot-done' : ''}`}>
                                      {sectionDone && <Check size={10} />}
                                    </div>
                                    <span>Part {si + 1}: {section.title}</span>
                                    <span className="edu-ptype">Read</span>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}

                        <Link
                          href={chapterHref}
                          className="edu-btn edu-btn-surface"
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            padding: '8px 14px',
                            borderRadius: 10,
                          }}
                        >
                          {status === 'done' ? 'Revisit chapter' : 'Start chapter'}{' '}
                          <ArrowRight size={13} />
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── DETAILS ── */}
      {activeTab === 'details' && (
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: 16,
              color: 'var(--text)',
            }}
          >
            About this level
          </h2>
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 15.5,
              lineHeight: 1.7,
              maxWidth: 680,
              marginBottom: 28,
            }}
          >
            {levelData.detail}
          </p>

          <h3
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted-2)',
              marginBottom: 12,
            }}
          >
            What you&apos;ll be able to do
          </h3>
          <div className="edu-outcomes">
            {levelData.outcomes.map((o, i) => (
              <div key={i} className="edu-outcome-item">
                <Check
                  size={15}
                  style={{ color: levelData.hex, flexShrink: 0, marginTop: 1 }}
                />
                {o}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INSTRUCTOR ── */}
      {activeTab === 'instructor' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '24px',
              background: 'var(--surface)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: levelData.hex,
                color: '#06241a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              K
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 4 }}>
                Kumami Team
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                Web3 Education · Kumami World
              </div>
            </div>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.7, maxWidth: 640 }}>
            Kumami World&apos;s education content is written and reviewed by experienced crypto practitioners and educators. Our goal is to make Web3 accessible to everyone, with clear, jargon-free explanations and real-world examples.
          </p>
        </div>
      )}

      {/* ── FAQ ── */}
      {activeTab === 'faq' && (
        <div>
          {[
            {
              q: 'Is this free?',
              a: 'Yes — all five levels are completely free. Kumami Pro unlocks extra features like badges and progress tracking.',
            },
            {
              q: 'Do I need any prior experience?',
              a: 'Level 1 assumes zero knowledge. If you already own crypto, feel free to start at Level 2.',
            },
            {
              q: 'How long does each level take?',
              a: `${levelData.title} takes approximately ${levelData.hours} to complete at a comfortable pace.`,
            },
            {
              q: 'Can I skip chapters?',
              a: 'Yes. Each chapter is independent. But the hands-on labs build on previous lessons.',
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: '18px 20px',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                marginBottom: 8,
              }}
            >
              <h4
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--text)',
                  marginBottom: 6,
                }}
              >
                {item.q}
              </h4>
              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.a}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── NEXT LEVEL ── */}
      {activeTab === 'overview' && levelData.n < 5 && (
        <div
          style={{
            marginTop: 36,
            padding: '20px 24px',
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--muted-2)',
                marginBottom: 4,
              }}
            >
              Up next
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Level {PHASES[levelData.n].n} — {PHASES[levelData.n].title}
            </div>
          </div>
          <Link
            href={`/education/${levelData.n + 1}`}
            className="edu-btn edu-btn-ghost"
          >
            Preview level <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}
