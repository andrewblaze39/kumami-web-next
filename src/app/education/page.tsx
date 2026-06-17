import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Clock, Trophy, ArrowRight } from 'lucide-react'
import { PHASES } from '@/data/educationPhases'

export const metadata: Metadata = {
  title: 'Learn Web3 — Kumami Education',
  description:
    "Level up your crypto and Web3 knowledge with Kumami's free education courses.",
  openGraph: {
    title: 'Learn Web3 — Kumami Education',
    description:
      "Level up your crypto and Web3 knowledge with Kumami's free education courses.",
    url: 'https://kumami.world/education',
    siteName: 'Kumami World',
    locale: 'en_US',
  },
  alternates: { canonical: 'https://kumami.world/education' },
}

export default function JourneyPage() {
  return (
    <div className="edu-content">

      {/* ── HERO ── */}
      <section className="edu-hero">
        <div>
          <span className="edu-eyebrow">
            <span className="edu-dia" />
            Kumami Education · Free forever
          </span>
          <h1 className="edu-hero-title">
            Start your{' '}
            <span className="edu-hero-grad">crypto journey</span>
          </h1>
          <p className="edu-lead">
            No prior knowledge needed. Five levels take you from buying your
            first Bitcoin to building in Web3 — each one shows exactly what&apos;s
            inside, so you can jump in wherever feels right.
          </p>
          <div className="edu-hero-cta">
            <Link href="/education/1" className="edu-btn edu-btn-primary edu-btn-lg">
              Start Level 1
            </Link>
            <a href="#journey" className="edu-btn edu-btn-ghost edu-btn-lg">
              See all levels
            </a>
          </div>
          <div className="edu-trust">
            <span className="edu-pill">65 lessons</span>
            <span className="edu-pill">5 hands-on labs</span>
            <span className="edu-pill">Text + video</span>
            <span className="edu-pill">Earn badges</span>
          </div>
        </div>

        {/* Kuma mascot — desktop only */}
        <div style={{ flexShrink: 0 }} aria-hidden="true">
          <svg
            width="220"
            height="220"
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="kg" cx="42%" cy="36%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e8eef0" />
              </radialGradient>
            </defs>
            {/* paws */}
            <ellipse cx="58" cy="196" rx="34" ry="34" fill="url(#kg)" />
            <ellipse cx="58" cy="190" rx="13" ry="15" fill="#0c1b16" />
            <circle cx="47" cy="178" r="4.4" fill="#0c1b16" />
            <circle cx="58" cy="174" r="4.4" fill="#0c1b16" />
            <circle cx="69" cy="178" r="4.4" fill="#0c1b16" />
            <ellipse cx="182" cy="196" rx="34" ry="34" fill="url(#kg)" />
            <ellipse cx="182" cy="190" rx="13" ry="15" fill="#0c1b16" />
            <circle cx="171" cy="178" r="4.4" fill="#0c1b16" />
            <circle cx="182" cy="174" r="4.4" fill="#0c1b16" />
            <circle cx="193" cy="178" r="4.4" fill="#0c1b16" />
            {/* ears */}
            <circle cx="74" cy="74" r="30" fill="url(#kg)" />
            <circle cx="74" cy="74" r="14" fill="#d7dee0" />
            <circle cx="166" cy="74" r="30" fill="url(#kg)" />
            <circle cx="166" cy="74" r="14" fill="#d7dee0" />
            {/* head */}
            <ellipse cx="120" cy="118" rx="86" ry="80" fill="url(#kg)" />
            {/* eyes */}
            <circle cx="92" cy="108" r="8.5" fill="#0c1b16" />
            <circle cx="148" cy="108" r="8.5" fill="#0c1b16" />
            <circle cx="89" cy="105" r="2.6" fill="#fff" />
            <circle cx="145" cy="105" r="2.6" fill="#fff" />
            {/* snout */}
            <ellipse cx="120" cy="150" rx="40" ry="32" fill="#f3ece1" />
            <ellipse cx="120" cy="134" rx="11" ry="8" fill="#0c1b16" />
            <path
              d="M120 142v9M120 151c0 7 -8 10 -13 7M120 151c0 7 8 10 13 7"
              stroke="#0c1b16"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            {/* cheeks */}
            <circle cx="62" cy="138" r="9" fill="#ffd1dc" opacity={0.55} />
            <circle cx="178" cy="138" r="9" fill="#ffd1dc" opacity={0.55} />
          </svg>
        </div>
      </section>

      {/* ── JOURNEY ── */}
      <section id="journey">
        <div className="edu-section-head">
          <span className="edu-eyebrow">
            <span className="edu-dia" />
            The Journey
          </span>
          <h2 className="edu-section-title" style={{ marginTop: 10 }}>
            Five levels. Pick your starting point.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14.5, marginTop: 8 }}>
            Every level lists its lessons, time, and the badge you&apos;ll earn — no
            guessing what&apos;s inside. Tap any level to open it.
          </p>
        </div>

        <div className="edu-journey">
          {PHASES.map(phase => {
            const handson = phase.chapters.filter(c =>
              c.startsWith('HANDS-ON')
            ).length

            return (
              <Link
                key={phase.n}
                href={`/education/${phase.n}`}
                className="edu-lv-card"
                style={{ '--c': phase.hex } as React.CSSProperties}
              >
                {/* Level number */}
                <div className="edu-lv-marker">{phase.n}</div>

                {/* Body */}
                <div>
                  <div className="edu-lv-tag">
                    {phase.level} · {phase.tag}
                  </div>
                  <h3 className="edu-lv-title">{phase.title}</h3>
                  <p className="edu-lv-blurb">{phase.blurb}</p>
                  <div className="edu-lv-meta">
                    <span className="edu-mi">
                      <BookOpen size={13} />
                      {phase.chapters.length} lessons
                    </span>
                    <span className="edu-mi">
                      <Clock size={13} />
                      {phase.hours}
                    </span>
                    {handson > 0 && (
                      <span className="edu-mi">
                        ⚡ {handson} lab
                      </span>
                    )}
                  </div>
                  <div className="edu-lv-badge">
                    <Trophy size={11} /> Earns &ldquo;{phase.badge}&rdquo;
                  </div>
                </div>

                {/* Right side progress */}
                <div className="edu-lv-side">
                  <div className="edu-prog-wrap">
                    <div className="edu-prog-row">
                      <span>Not started</span>
                      <span>0 / {phase.chapters.length}</span>
                    </div>
                    <div className="edu-progress">
                      <i style={{ width: '0%' }} />
                    </div>
                  </div>
                  <span className="edu-lv-go">
                    Start level <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
