'use client'

import Link from 'next/link'
import { BookOpen, Clock, Trophy, ArrowRight, Check } from 'lucide-react'
import { PHASES } from '@/data/educationPhases'
import { useEducationProgress } from '@/hooks/useEducationProgress'

function LevelCard({ phase }: { phase: typeof PHASES[number] }) {
  const { isChapterComplete } = useEducationProgress(phase.n)

  const handson = phase.chapters.filter(c => c.startsWith('HANDS-ON')).length
  const doneCh = phase.chapters.filter((_, ci) => isChapterComplete(ci)).length
  const totalCh = phase.chapters.length
  const pct = totalCh > 0 ? Math.round((doneCh / totalCh) * 100) : 0
  const started = doneCh > 0

  return (
    <Link
      href={`/education/${phase.n}`}
      className="edu-lv-card"
      style={{ '--c': phase.hex } as React.CSSProperties}
    >
      {/* Level circle number */}
      <div className="edu-lv-marker">
        {doneCh === totalCh && doneCh > 0 ? (
          <Check size={22} strokeWidth={2.5} />
        ) : (
          phase.n
        )}
      </div>

      {/* Tag */}
      <div className="edu-lv-tag">
        Level {phase.n} · {phase.tag}
      </div>

      {/* Title + blurb */}
      <h3 className="edu-lv-title">{phase.title}</h3>
      <p className="edu-lv-blurb">{phase.blurb}</p>

      {/* Stats */}
      <div className="edu-lv-meta">
        <span className="edu-mi">
          <BookOpen size={12} />
          {phase.chapters.length} lessons
        </span>
        <span className="edu-mi">
          <Clock size={12} />
          {phase.hours}
        </span>
        {handson > 0 && (
          <span className="edu-mi">
            ⚡ {handson} lab
          </span>
        )}
      </div>

      {/* Badge earned pill */}
      <div className="edu-lv-badge">
        <Trophy size={11} /> Earns &ldquo;{phase.badge}&rdquo;
      </div>

      {/* Progress + CTA */}
      <div className="edu-lv-side">
        <div className="edu-prog-wrap">
          <div className="edu-prog-row">
            <span>{started ? (doneCh === totalCh ? 'Complete!' : 'In progress') : 'Not started'}</span>
            <span>{doneCh} / {totalCh}</span>
          </div>
          <div className="edu-progress">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="edu-lv-go">
          {doneCh === totalCh && totalCh > 0 ? 'Review level' : started ? 'Continue' : 'Start level'}{' '}
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  )
}

export default function JourneyLevelCards() {
  return (
    <div className="edu-journey">
      {PHASES.map(phase => (
        <LevelCard key={phase.n} phase={phase} />
      ))}
    </div>
  )
}
