'use client'

import { useState } from 'react'
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
import { PHASES, chapterParts, PARTS_POOL, TYPE_POOL } from '@/data/educationPhases'

interface Props {
  params: { phase: string }
}

export default function CoursePage({ params }: Props) {
  const phaseNum = parseInt(params.phase)
  const phase = PHASES.find(p => p.n === phaseNum)
  if (!phase) notFound()

  const [activeTab, setActiveTab] = useState<
    'overview' | 'details' | 'instructor' | 'reviews' | 'faq'
  >('overview')
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set([0]))

  const pct = 0 // progress — 0 for now until Firebase user progress is wired up
  const doneCh = 0

  function toggleChapter(i: number) {
    setOpenChapters(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'details', label: 'Details' },
    { id: 'instructor', label: 'Instructor' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'faq', label: 'FAQ' },
  ] as const

  return (
    <div className="edu-content">

      {/* ── COURSE HERO ── */}
      <div
        className="edu-phero"
        style={{ '--c': phase.hex } as React.CSSProperties}
      >
        <div className="edu-phero-glow" />
        <div className="edu-phero-grid">
          <div>
            <span
              className="edu-lv-tag"
              style={{ color: phase.hex, fontSize: 12 }}
            >
              {phase.level} · {phase.tag}
            </span>
            <h1>{phase.title}</h1>
            <p style={{ color: 'var(--muted)', fontSize: 15, margin: '4px 0 0' }}>
              {phase.blurb}
            </p>
            <div className="edu-pmeta">
              <span className="edu-pill">
                <BookOpen size={12} /> {phase.chapters.length} chapters
              </span>
              <span className="edu-pill">
                <Clock size={12} /> {phase.hours}
              </span>
              <span className="edu-pill">
                <Trophy size={12} /> Badge: {phase.badge}
              </span>
              <span className="edu-pill-free">Free</span>
            </div>
          </div>

          <div className="edu-phero-side">
            <div className="edu-pc" style={{ color: phase.hex }}>
              {pct}%
            </div>
            <div className="edu-pcl">
              {doneCh} of {phase.chapters.length} chapters complete
            </div>
            <div className="edu-progress" style={{ width: 160, marginBottom: 16 }}>
              <i style={{ width: `${pct}%`, background: phase.hex }} />
            </div>
            <Link
              href={`/education/${phase.n}/0`}
              className="edu-btn edu-btn-primary"
              style={{ background: phase.hex, color: '#06241a' }}
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
        style={{ '--c': phase.hex } as React.CSSProperties}
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
              {phase.chapters.length} chapters · {phase.hours}
            </span>
          </div>

          {phase.chapters.map((chapter, ci) => {
            const isLab = chapter.startsWith('HANDS-ON')
            const title = isLab ? chapter.replace('HANDS-ON: ', '') : chapter
            const nParts = chapterParts(ci)
            const status =
              ci < doneCh ? 'done' : ci === doneCh ? 'current' : 'upcoming'
            const isOpen = openChapters.has(ci)

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
                        ? ({ background: phase.hex, color: '#06241a' } as React.CSSProperties)
                        : {}
                    }
                  >
                    {status === 'done' ? (
                      <Check size={13} />
                    ) : (
                      ci + 1
                    )}
                  </div>

                  <div className="edu-ch-title">
                    <span
                      className={isLab ? 'edu-ch-title-lab' : ''}
                      style={
                        isLab
                          ? ({ color: phase.hex } as React.CSSProperties)
                          : {}
                      }
                    >
                      {isLab && '⚡ '}
                      {title}
                    </span>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--muted-2)',
                        marginTop: 2,
                      }}
                    >
                      {nParts} parts
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

                {/* Expandable parts */}
                {isOpen && (
                  <div className="edu-ch-body">
                    {Array.from({ length: nParts }).map((_, k) => {
                      const partDone =
                        status === 'done' || (status === 'current' && k < 1)
                      return (
                        <div key={k} className="edu-part">
                          <div
                            className={`edu-pdot ${partDone ? 'edu-pdot-done' : ''}`}
                          >
                            {partDone && <Check size={10} />}
                          </div>
                          <span>
                            <b>Part {k + 1}:</b>{' '}
                            {PARTS_POOL[k % PARTS_POOL.length]}
                          </span>
                          <span className="edu-ptype">
                            {isLab && k === nParts - 1
                              ? 'Lab'
                              : TYPE_POOL[k % TYPE_POOL.length]}
                          </span>
                        </div>
                      )
                    })}
                    {/* Start chapter button */}
                    <Link
                      href={`/education/${phase.n}/${ci}`}
                      className="edu-btn edu-btn-surface"
                      style={{
                        marginTop: 12,
                        fontSize: 13,
                        padding: '8px 14px',
                        borderRadius: 10,
                      }}
                    >
                      {status === 'done' ? 'Review' : 'Start chapter'}{' '}
                      <ArrowRight size={13} />
                    </Link>
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
            {phase.detail}
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
            {phase.outcomes.map((o, i) => (
              <div key={i} className="edu-outcome-item">
                <Check
                  size={15}
                  style={{ color: phase.hex, flexShrink: 0, marginTop: 1 }}
                />
                {o}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INSTRUCTOR ── */}
      {activeTab === 'instructor' && (
        <div
          style={{
            padding: 32,
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            textAlign: 'center',
            color: 'var(--muted)',
          }}
        >
          Instructor profiles coming soon.
        </div>
      )}

      {/* ── REVIEWS ── */}
      {activeTab === 'reviews' && (
        <div
          style={{
            padding: 32,
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            textAlign: 'center',
            color: 'var(--muted)',
          }}
        >
          Reviews coming soon.
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
              a: `${phase.title} takes approximately ${phase.hours} to complete at a comfortable pace.`,
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

      {/* ── NEXT PHASE ── */}
      {activeTab === 'overview' && phase.n < 5 && (
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
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              {PHASES[phase.n].level} — {PHASES[phase.n].title}
            </div>
          </div>
          <Link
            href={`/education/${phase.n + 1}`}
            className="edu-btn edu-btn-ghost"
          >
            Preview level <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}
