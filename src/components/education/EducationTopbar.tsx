'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Menu } from 'lucide-react'
import { PHASES } from '@/data/educationPhases'

export default function EducationTopbar() {
  const pathname = usePathname()

  // Build breadcrumb
  const crumbs: { label: string; href?: string }[] = [
    { label: 'Education', href: '/education' },
  ]

  const parts = pathname.split('/').filter(Boolean) // ['education', '1', '0']

  if (parts.length >= 2) {
    const phaseNum = parseInt(parts[1])
    const phase = PHASES.find(p => p.n === phaseNum)
    if (phase) {
      crumbs.push({ label: `${phase.level} · ${phase.tag}`, href: `/education/${phase.n}` })
    }
  }

  if (parts.length >= 3) {
    const phaseNum = parseInt(parts[1])
    const lessonIdx = parseInt(parts[2])
    const phase = PHASES.find(p => p.n === phaseNum)
    if (phase) {
      const chapter = phase.chapters[lessonIdx]
      if (chapter) {
        const title = chapter.startsWith('HANDS-ON: ')
          ? chapter.replace('HANDS-ON: ', '')
          : chapter
        crumbs.push({ label: title })
      }
    }
  }

  const last = crumbs[crumbs.length - 1]

  return (
    <header className="edu-topbar">
      {/* Mobile menu button */}
      <button
        className="edu-menu-btn"
        onClick={() => {
          const sb = document.getElementById('edu-sidebar')
          const ov = document.querySelector('.edu-overlay')
          sb?.classList.toggle('edu-open')
          ov?.classList.toggle('edu-open')
        }}
        aria-label="Menu"
        style={{ display: 'flex' }}
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <nav className="edu-crumb" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {i > 0 && (
              <ChevronRight size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
            )}
            {c.href && c !== last ? (
              <Link href={c.href}>{c.label}</Link>
            ) : (
              <b>{c.label}</b>
            )}
          </span>
        ))}
      </nav>

      <div className="edu-topbar-spacer" />

      <div className="edu-topbar-actions">
        <span className="edu-pill-free">Free forever</span>
        <Link
          href="/subscribe"
          className="edu-btn edu-btn-surface"
          style={{ padding: '9px 16px', fontSize: 13.5, borderRadius: 10 }}
        >
          Get Kumami Pro
        </Link>
      </div>
    </header>
  )
}
