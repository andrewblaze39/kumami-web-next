import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import JourneyLevelCards from '@/components/education/JourneyLevelCards'

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
            Kumami Education
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

        {/* Kumami logo — desktop only */}
        <div style={{ flexShrink: 0 }} aria-hidden="true">
          <Image
            src="/logo-kumami-final.png"
            alt="Kumami World"
            width={220}
            height={220}
            style={{ objectFit: 'contain', width: 220, height: 'auto' }}
            priority
          />
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

        <JourneyLevelCards />
      </section>
    </div>
  )
}
