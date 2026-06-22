'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Menu } from 'lucide-react'
import { PHASES } from '@/data/educationPhases'
import { useEducationSidebar } from '@/contexts/EducationSidebarContext'

export default function EducationTopbar() {
  const pathname = usePathname()
  const { toggle } = useEducationSidebar()

  // Build breadcrumb — skip "Education" label on the education homepage (sidebar already shows it)
  const crumbs: { label: string; href?: string }[] = []
  if (pathname !== '/education' && pathname !== '/education/dashboard') {
    crumbs.push({ label: 'Education', href: '/education' })
  }

  const parts = pathname.split('/').filter(Boolean) // ['education', '1', '0'] or ['education', 'article', 'docId']

  if (parts.length >= 2) {
    const segment = parts[1]

    if (segment === 'article' && parts.length >= 3) {
      // /education/article/[id] — breadcrumb is just "Article"; renderer shows full breadcrumb
      crumbs.push({ label: 'Article' })
    } else if (segment === 'all') {
      crumbs.push({ label: 'All Lessons' })
    } else {
      const levelNum = parseInt(segment)
      const phase = PHASES.find(p => p.n === levelNum)
      if (phase) {
        crumbs.push({ label: `Level ${phase.n}: ${phase.title}`, href: `/education/${phase.n}` })
      }
    }
  }

  if (parts.length >= 3 && parts[1] !== 'article' && parts[1] !== 'all') {
    const levelNum = parseInt(parts[1])
    const lessonIdx = parseInt(parts[2])
    const phase = PHASES.find(p => p.n === levelNum)
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
      {/* Mobile menu button — uses context, no DOM manipulation */}
      <button
        className="edu-menu-btn"
        onClick={toggle}
        aria-label="Menu"
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
    </header>
  )
}
