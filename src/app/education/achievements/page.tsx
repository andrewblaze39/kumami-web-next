'use client'

import Link from 'next/link'
import { Trophy, Lock, Check, ArrowRight } from 'lucide-react'
import { PHASES } from '@/data/educationPhases'
import { useEducationProgress } from '@/hooks/useEducationProgress'

// One card per level — each calls the hook for its own level number
function AchievementCard({ phase }: { phase: typeof PHASES[number] }) {
  const { isChapterComplete } = useEducationProgress(phase.n)

  const totalCh = phase.chapters.length
  const doneCh = phase.chapters.filter((_, ci) => isChapterComplete(ci)).length
  const earned = totalCh > 0 && doneCh === totalCh

  return (
    <div
      style={{
        padding: '24px',
        borderRadius: 'var(--radius)',
        background: earned ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${earned ? phase.hex + '44' : 'var(--border)'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Glow for earned */}
      {earned && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(300px circle at 50% 0%, ${phase.hex}18, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Badge icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: earned ? phase.hex : 'var(--surface-3)',
          border: `2px solid ${earned ? phase.hex : 'var(--border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          color: earned ? '#06241a' : 'var(--muted-2)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {earned ? <Trophy size={30} strokeWidth={2} /> : <Lock size={26} strokeWidth={1.8} />}
      </div>

      {/* Badge name */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: earned ? phase.hex : 'var(--muted)',
            letterSpacing: '-0.01em',
            marginBottom: 4,
          }}
        >
          {phase.badge}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted-2)', fontWeight: 600 }}>
          Level {phase.n}: {phase.title}
        </div>
      </div>

      {/* Status */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {earned ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              background: `${phase.hex}20`,
              border: `1px solid ${phase.hex}44`,
              fontSize: 12,
              fontWeight: 700,
              color: phase.hex,
            }}
          >
            <Check size={12} strokeWidth={2.5} /> Earned
          </div>
        ) : (
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted-2)',
              fontWeight: 600,
            }}
          >
            {doneCh > 0
              ? `${doneCh} / ${totalCh} chapters done`
              : `Complete Level ${phase.n} to unlock`}
          </div>
        )}
      </div>

      {/* CTA */}
      {!earned && (
        <Link
          href={`/education/${phase.n}`}
          style={{
            fontSize: 12.5,
            color: 'var(--muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 600,
            position: 'relative',
            zIndex: 1,
          }}
        >
          Go to Level {phase.n} <ArrowRight size={11} />
        </Link>
      )}
    </div>
  )
}

// Count earned badges by rendering progress for each level
function EarnedCount() {
  const p1 = useEducationProgress(1)
  const p2 = useEducationProgress(2)
  const p3 = useEducationProgress(3)
  const p4 = useEducationProgress(4)
  const p5 = useEducationProgress(5)

  const progresses = [p1, p2, p3, p4, p5]
  const earned = PHASES.filter((phase, i) => {
    const { isChapterComplete } = progresses[i]
    return phase.chapters.every((_, ci) => isChapterComplete(ci))
  }).length

  return (
    <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 15 }}>
      {earned} of {PHASES.length} earned
    </span>
  )
}

export default function AchievementsPage() {
  return (
    <div className="edu-content">
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div className="edu-eyebrow" style={{ marginBottom: 12 }}>
          <span className="edu-dia" />
          Your progress
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Achievements
          </h1>
          <EarnedCount />
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14.5, marginTop: 10, maxWidth: 520 }}>
          Complete all chapters in a level to earn its badge. Each badge is a permanent mark of your knowledge.
        </p>
      </div>

      {/* Achievement cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {PHASES.map(phase => (
          <AchievementCard key={phase.n} phase={phase} />
        ))}
      </div>
    </div>
  )
}
