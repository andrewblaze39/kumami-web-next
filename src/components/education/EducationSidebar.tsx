'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Home,
  Map,
  BookOpen,
  Trophy,
  Sparkles,
  Bookmark,
  Settings,
  Menu,
  X,
} from 'lucide-react'

interface NavItem {
  key: string
  label: string
  href: string
  icon: React.ReactNode
}

const LEARN_ITEMS: NavItem[] = [
  { key: 'journey',      label: 'The Journey',   href: '/education',        icon: <Map size={19} strokeWidth={1.9} /> },
  { key: 'courses',      label: 'My Courses',    href: '/education/1',      icon: <BookOpen size={19} strokeWidth={1.9} /> },
  { key: 'achievements', label: 'Achievements',  href: '/education',        icon: <Trophy size={19} strokeWidth={1.9} /> },
]

const MORE_ITEMS: NavItem[] = [
  { key: 'warmup',   label: 'Warm Up',   href: '/education', icon: <Sparkles size={19} strokeWidth={1.9} /> },
  { key: 'saved',    label: 'Saved',     href: '/education', icon: <Bookmark size={19} strokeWidth={1.9} /> },
  { key: 'settings', label: 'Settings',  href: '/education', icon: <Settings size={19} strokeWidth={1.9} /> },
]

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`edu-nav-item${active ? ' edu-active' : ''}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  )
}

export default function EducationSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function activeKey() {
    if (pathname === '/education') return 'journey'
    if (pathname.startsWith('/education/')) return 'courses'
    return ''
  }
  const ak = activeKey()

  return (
    <>
      {/* Mobile toggle button — rendered inside topbar via portal-like approach */}
      <button
        className="edu-menu-btn"
        id="edu-sidebar-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle menu"
        style={{ display: 'none' }} // shown via CSS on mobile
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      <div
        className={`edu-overlay${open ? ' edu-open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`edu-sidebar${open ? ' edu-open' : ''}`} id="edu-sidebar">
        {/* Brand → homepage */}
        <Link href="/" className="edu-brand" onClick={() => setOpen(false)}>
          <span className="edu-brand-logo">
            kūmami <small>WORLD</small>
          </span>
        </Link>

        {/* Home link */}
        <div className="edu-nav-group">
          <Link
            href="/"
            className="edu-nav-item"
            onClick={() => setOpen(false)}
          >
            <Home size={19} strokeWidth={1.9} />
            <span>Home</span>
          </Link>
        </div>

        {/* Learn group */}
        <div className="edu-nav-group">
          <div className="edu-nav-label">Learn</div>
          {LEARN_ITEMS.map(item => (
            <NavLink key={item.key} item={item} active={ak === item.key} />
          ))}
        </div>

        {/* More group */}
        <div className="edu-nav-group">
          <div className="edu-nav-label">More</div>
          {MORE_ITEMS.map(item => (
            <NavLink key={item.key} item={item} active={false} />
          ))}
        </div>

        {/* Footer — close button on mobile */}
        <div className="edu-sidebar-foot">
          <button
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'inherit',
            }}
            className="edu-menu-close"
          >
            <X size={16} />
            Close menu
          </button>
        </div>
      </aside>
    </>
  )
}
