'use client'

import { useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  Play,
  Clock,
  Layers,
  Check,
  Shield,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'
import {
  PHASES,
  chapterParts,
  PARTS_POOL,
  TYPE_POOL,
} from '@/data/educationPhases'

interface Props {
  params: { phase: string; lesson: string }
}

export default function LessonPage({ params }: Props) {
  const phaseNum = parseInt(params.phase)
  const lessonIdx = parseInt(params.lesson)
  const phase = PHASES.find(p => p.n === phaseNum)
  if (!phase) notFound()

  const chapter = phase.chapters[lessonIdx]
  if (!chapter) notFound()

  const isLab = chapter.startsWith('HANDS-ON')
  const title = isLab ? chapter.replace('HANDS-ON: ', '') : chapter
  const nParts = chapterParts(lessonIdx)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const doneCh = 0 // to be wired to Firebase progress

  const nextLesson = lessonIdx < phase.chapters.length - 1
    ? { phaseN: phase.n, idx: lessonIdx + 1 }
    : phase.n < 5
    ? { phaseN: phase.n + 1, idx: 0 }
    : null

  return (
    <div className="edu-content">
      <div className="edu-lesson-grid">

        {/* ── ARTICLE ── */}
        <article className="edu-article">

          {/* Header */}
          <div className="edu-l-head">
            <span
              className="edu-lv-tag"
              style={{ color: phase.hex, fontSize: 12 }}
            >
              {phase.level} · {phase.title} · Chapter {lessonIdx + 1}
            </span>
            <h1>{title}</h1>
            <div className="edu-l-meta">
              {isLab && (
                <span className="edu-mi" style={{ color: phase.hex }}>
                  ⚡ Hands-on lab
                </span>
              )}
              <span className="edu-mi">
                <Layers size={13} /> {nParts} parts
              </span>
              <span className="edu-mi">
                <Clock size={13} /> {5 + (lessonIdx % 6)} min read
              </span>
              <span className="edu-mi">
                <Play size={13} /> {4 + (lessonIdx % 4)} min video
              </span>
            </div>
          </div>

          {/* Video player */}
          <div className="edu-player-wrap">
            {!videoPlaying ? (
              <div className="edu-play-poster" onClick={() => setVideoPlaying(true)}>
                <button className="edu-play-btn" aria-label="Play video">
                  <Play size={28} fill="#06241a" />
                </button>
                <span className="edu-play-label">
                  {title} — watch &amp; read together
                </span>
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--muted)',
                  fontSize: 14,
                }}
              >
                Video player coming soon
              </div>
            )}
          </div>

          {/* Article body */}
          <div className="edu-art-body">
            <p>
              Before we touch a single button, let&apos;s get the picture clear.{' '}
              <strong>{title}</strong> sounds technical, but the idea underneath
              it is simple — and once it clicks, a lot of crypto stops feeling
              like guesswork. This chapter pairs a short video with the read
              below, so you can watch, then follow along at your own pace.
            </p>

            {/* Key terms */}
            <div className="edu-terms">
              <h4>Key terms in this chapter</h4>
              <dl>
                <dt>{title.split(' ').slice(-2).join(' ')}</dt>
                <dd>
                  The core concept we&apos;ll unpack, in plain language with a real
                  example.
                </dd>
                <dt>Why it matters</dt>
                <dd>
                  How this shows up the moment you actually use crypto — not
                  just in theory.
                </dd>
              </dl>
            </div>

            <h2>The short version</h2>
            <p>
              Here&apos;s the one-paragraph answer you can keep:{' '}
              {title.replace(/^(How|What|Why) /i, '')} comes down to a few
              moving parts working together. We&apos;ll name each one, show how
              they connect, and point out exactly where beginners trip up so
              you don&apos;t have to.
            </p>

            <div className="edu-callout">
              <Shield
                size={18}
                style={{ color: 'var(--mint)', flexShrink: 0, marginTop: 2 }}
              />
              <div>
                <b>Safety first.</b>
                <p>
                  Whenever real money or keys are involved, we flag it. If a
                  step can&apos;t be undone, you&apos;ll see a warning before it — not
                  after.
                </p>
              </div>
            </div>

            <h2>Walking through it</h2>
            <p>
              Let&apos;s go step by step. None of this requires code, and you can
              stop at any point — your progress saves automatically.
            </p>
            <ol>
              <li>
                <strong>Start with the goal.</strong> Know what you&apos;re trying to
                achieve before you click anything.
              </li>
              <li>
                <strong>Understand the mechanic.</strong> What is actually
                happening under the hood? Where does your money go?
              </li>
              <li>
                <strong>Do the thing with real (small) money.</strong> $5–$20
                is enough to learn. Reading about it is not the same.
              </li>
              <li>
                <strong>Verify it worked.</strong> Check the block explorer.
                See your transaction. Trust but verify.
              </li>
            </ol>

            <h2>The things that trip people up</h2>
            <p>
              Every chapter has a short &ldquo;watch out for these&rdquo; section — because
              the most expensive lessons in crypto are usually avoidable ones.
              We&apos;ve collected the common mistakes so you don&apos;t have to make them
              yourself.
            </p>

            {isLab && (
              <div
                style={{
                  marginTop: 24,
                  padding: '20px 24px',
                  background: `rgba(${phase.hex === '#5ee9a8' ? '94,233,168' : phase.hex === '#2dd4bf' ? '45,212,191' : '86,223,230'},.08)`,
                  border: `1px solid ${phase.hex}33`,
                  borderRadius: 'var(--radius)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: phase.hex,
                    marginBottom: 8,
                  }}
                >
                  ⚡ Hands-on lab
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'var(--text)',
                    marginBottom: 10,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    color: 'var(--muted)',
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  This is the practical exercise for {phase.title}. Follow the
                  steps carefully, use real money in small amounts, and complete
                  each step before moving to the next. This is where theory
                  becomes skill.
                </p>
              </div>
            )}
          </div>
        </article>

        {/* ── RAIL (right sidebar) ── */}
        <aside className="edu-rail">
          <div className="edu-rail-title">Course outline</div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted-2)',
              marginBottom: 12,
              padding: '0 4px',
            }}
          >
            {phase.level} · {phase.title}
          </div>

          {phase.chapters.map((ch, ci) => {
            const chIsLab = ch.startsWith('HANDS-ON')
            const chTitle = chIsLab ? ch.replace('HANDS-ON: ', '') : ch
            const chDone = ci < doneCh
            const chActive = ci === lessonIdx

            return (
              <Link
                key={ci}
                href={`/education/${phase.n}/${ci}`}
                className={`edu-rail-item${chActive ? ' edu-rail-active' : ''}`}
              >
                <div
                  className={`edu-rail-no ${chDone ? 'edu-rail-no-done' : ''}`}
                  style={
                    chActive
                      ? ({ background: phase.hex, color: '#06241a' } as React.CSSProperties)
                      : {}
                  }
                >
                  {chDone ? <Check size={11} /> : ci + 1}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    lineHeight: 1.35,
                    color: chActive ? 'var(--text)' : 'var(--muted)',
                  }}
                >
                  {chIsLab ? '⚡ ' : ''}
                  {chTitle}
                </span>
              </Link>
            )
          })}

          {/* Parts for this chapter */}
          <div style={{ marginTop: 16, padding: '0 4px' }}>
            <div className="edu-rail-title">This chapter</div>
            {Array.from({ length: nParts }).map((_, k) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom: k < nParts - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12.5,
                  color: 'var(--muted)',
                }}
              >
                <div
                  className="edu-pdot"
                  style={{ width: 16, height: 16 }}
                />
                <span>
                  Part {k + 1} — {PARTS_POOL[k % PARTS_POOL.length]}
                </span>
                <span
                  className="edu-ptype"
                  style={{ marginLeft: 'auto', fontSize: 10 }}
                >
                  {TYPE_POOL[k % TYPE_POOL.length]}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ── COMPLETE & CONTINUE ── */}
      <div className="edu-complete-bar">
        {nextLesson ? (
          <Link
            href={`/education/${nextLesson.phaseN}/${nextLesson.idx}`}
            className="edu-complete-btn"
            style={{ background: phase.hex }}
          >
            Complete &amp; Continue <ChevronRight size={16} />
          </Link>
        ) : (
          <Link
            href="/education"
            className="edu-complete-btn"
            style={{ background: phase.hex }}
          >
            Finish course <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </div>
  )
}
