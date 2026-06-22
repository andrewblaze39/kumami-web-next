'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, BookOpen, Trophy, Settings } from 'lucide-react'
import { useEducationSidebar } from '@/contexts/EducationSidebarContext'
import { PHASES } from '@/data/educationPhases'

interface NavItem {
  key: string
  label: string
  href: string
  icon: React.ReactNode
}

const LEARN_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard',   href: '/education/dashboard',    icon: <Home     size={19} strokeWidth={1.9} /> },
  { key: 'journey',  label: 'The Journey', href: '/education',               icon: <Map      size={19} strokeWidth={1.9} /> },
  { key: 'courses',  label: 'My Courses',  href: '/education/1',             icon: <BookOpen size={19} strokeWidth={1.9} /> },
  { key: 'achieve',  label: 'Achievements',href: '/education/achievements',  icon: <Trophy   size={19} strokeWidth={1.9} /> },
]

const MORE_ITEMS: NavItem[] = [
  { key: 'settings', label: 'Settings', href: '/education', icon: <Settings size={19} strokeWidth={1.9} /> },
]

function NavLink({ item, active, onClose }: { item: NavItem; active: boolean; onClose: () => void }) {
  return (
    <Link
      href={item.href}
      className={`edu-nav-item${active ? ' edu-active' : ''}`}
      onClick={onClose}
    >
      {item.icon}
      <span style={{ flex: 1 }}>{item.label}</span>
    </Link>
  )
}

export default function EducationSidebar() {
  const pathname = usePathname()
  const { isOpen, close } = useEducationSidebar()

  // Detect current level from pathname like /education/3 or /education/3/5
  const parts = pathname.split('/').filter(Boolean)
  const currentLevelNum = parts[0] === 'education' && parts[1] && !isNaN(Number(parts[1]))
    ? Number(parts[1])
    : null

  const learnActive = (item: NavItem) => {
    if (item.key === 'dashboard') return pathname === '/education/dashboard'
    if (item.key === 'journey') return pathname === '/education'
    if (item.key === 'courses') return pathname.startsWith('/education/') && pathname !== '/education/achievements' && pathname !== '/education/dashboard'
    if (item.key === 'achieve') return pathname === '/education/achievements'
    return false
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`edu-overlay${isOpen ? ' edu-open' : ''}`}
        onClick={close}
      />

      {/* Sidebar */}
      <aside className={`edu-sidebar${isOpen ? ' edu-open' : ''}`}>
        {/* Brand */}
        <Link href="/education" className="edu-brand" onClick={close}>
          <span className="edu-brand-edu">Kumami Education</span>
        </Link>

        {/* Learn group */}
        <div className="edu-nav-group">
          <div className="edu-nav-label">Learn</div>
          {LEARN_ITEMS.map(item => (
            <NavLink key={item.key} item={item} active={learnActive(item)} onClose={close} />
          ))}
        </div>

        {/* More group */}
        <div className="edu-nav-group">
          <div className="edu-nav-label">More</div>
          {MORE_ITEMS.map(item => (
            <NavLink key={item.key} item={item} active={false} onClose={close} />
          ))}
        </div>

        {/* Levels group */}
        <div className="edu-nav-group">
          <div className="edu-nav-label">Levels</div>
          {PHASES.map(phase => {
            const isActive = currentLevelNum === phase.n
            return (
              <Link
                key={phase.n}
                href={`/education/${phase.n}`}
                className={`edu-nav-item${isActive ? ' edu-active' : ''}`}
                onClick={close}
                style={{ fontSize: 13 }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: isActive ? phase.hex : 'transparent',
                    border: `1.5px solid ${isActive ? phase.hex : 'var(--border)'}`,
                    color: isActive ? '#06241a' : phase.hex,
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {phase.n}
                </span>
                <span>Level {phase.n}: {phase.title}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer spacer — no close button */}
        <div className="edu-sidebar-foot" />
      </aside>
    </>
  )
}
