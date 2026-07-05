'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useWorldMode } from '@/contexts/WorldModeContext';
import { useAuth } from '@/contexts/AuthContext';

// ---- Nav configs (from mockup BEGINNER_NAV / ADV_NAV) ----

type NavItem = {
  k: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: 'dot' | 'lock';
};

type NavGroup = {
  grp: string;
  items: NavItem[];
};

// Lucide-style SVG icons matching mockup icon keys
const Icons = {
  news: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h13v14H4Z" /><path d="M17 8h3v9a2 2 0 0 1-2 2" /><path d="M7 9h7M7 13h7M7 17h4" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </svg>
  ),
  grad: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 4 9 4-9 4-9-4 9-4Z" /><path d="M5 10v4c0 1.5 3 3 7 3s7-1.5 7-3v-4" />
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M7.5 14h9" />
    </svg>
  ),
  game: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="7.5" width="19" height="11" rx="4" /><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 13.5h.01" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5M3 16.5l9 5 9-5" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h8l4 4v14H6Z" /><path d="M14 3v4h4M9 13h6M9 17h4" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4-6 4Z" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" /><path d="M19.4 13.5a7.5 7.5 0 0 0 0-3l1.8-1.4-1.8-3.1-2.1.9a7.5 7.5 0 0 0-2.6-1.5L14 3h-4l-.4 2a7.5 7.5 0 0 0-2.6 1.5l-2.1-.9-1.8 3.1L4.9 10a7.5 7.5 0 0 0 0 3l-1.8 1.4 1.8 3.1 2.1-.9a7.5 7.5 0 0 0 2.6 1.5L10 21h4l.4-2.4a7.5 7.5 0 0 0 2.6-1.5l2.1.9 1.8-3.1Z" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3 5 13h5l-1 8 8-10h-5Z" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M5 5l2.5 2.5M16.5 16.5 19 19M3 12h4M17 12h4M5 19l2.5-2.5M16.5 7.5 19 5" /><circle cx="12" cy="12" r="3.2" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10v4a5 5 0 0 1-10 0Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /><path d="M12 13v4M9 21h6M10 17h4" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6M16.5 14.4A5.5 5.5 0 0 1 20.5 20" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6Z" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V5l8-2v18M12 21V9l7 2v10M4 21h16" /><path d="M7 8h2M7 12h2M7 16h2M15 13h1M15 17h1" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  ),
};

const BEGINNER_NAV: NavGroup[] = [
  {
    grp: 'Discover',
    items: [
      { k: 'news', label: 'News Portal', href: '/world/news', icon: Icons.news },
      { k: 'courses', label: 'Courses', href: '/world/courses', icon: Icons.book },
      { k: 'education', label: 'Education', href: '/world/education', icon: Icons.grad },
    ],
  },
  {
    grp: 'Explore',
    items: [
      { k: 'ailabs', label: 'AI Labs', href: '/world/ailabs', icon: Icons.flask },
      { k: 'games', label: 'Games', href: '/world/games', icon: Icons.game },
    ],
  },
];

const ADV_NAV: NavGroup[] = [
  {
    grp: 'Intelligence',
    items: [
      { k: 'console', label: 'Console', href: '/world/console', icon: Icons.home },
      { k: 'onchain', label: 'On-Chain Insights', href: '/world/onchain', icon: Icons.layers },
      { k: 'intel', label: 'Intelligence', href: '/world/intel', icon: Icons.doc },
      { k: 'watchlist', label: 'Watchlist', href: '/world/watchlist', icon: Icons.bookmark },
    ],
  },
  {
    grp: 'Account',
    items: [
      { k: 'settings', label: 'Settings', href: '/world/settings', icon: Icons.gear },
    ],
  },
];

// PRO nav items — all link to /world/pro (locked)
const PRO_NAV_ITEMS = [
  { label: 'Alpha Room', icon: Icons.bolt },
  { label: 'Airdrop Radar', icon: Icons.spark },
  { label: 'AI Portfolio Manager', icon: Icons.trophy },
  { label: 'Smart Money Tracker', icon: Icons.users },
  { label: 'Coin / Token Tracker', icon: Icons.layers },
  { label: 'Market Analysis', icon: Icons.doc },
  { label: 'Q&A with Core Teams', icon: Icons.spark },
  { label: 'Major-Move Alerts', icon: Icons.shield },
  { label: 'Whitelist & Events', icon: Icons.trophy },
  { label: 'Flow Radar', icon: Icons.bolt },
];

// Company menu links
const COMPANY_LINKS = [
  { label: 'About Kumami', href: '#', icon: Icons.building },
  { label: 'How it works', href: '#', icon: Icons.spark },
  { label: 'Careers', href: '#', icon: Icons.users },
  { label: 'Blog', href: '/news', icon: Icons.news },
  { label: 'Contact', href: '#', icon: Icons.doc },
];

export default function Sidebar() {
  const { mode } = useWorldMode();
  const { currentUser, userData, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = mode === 'beginner' ? BEGINNER_NAV : mode === 'advanced' ? ADV_NAV : null;

  const isActive = (href: string) => pathname.startsWith(href);

  // Determine display name
  const displayName = userData?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'You';
  const tierLabel =
    mode === 'pro' ? 'Pro · Live' :
    mode === 'advanced' ? 'Advanced · Live' :
    'Free plan';

  return (
    <aside className={`w-sidebar${mode === 'advanced' ? ' is-adv' : mode === 'pro' ? ' is-pro' : ''}`} id="w-sidebar">

      {/* ---- Brand / logo + dropdown ---- */}
      <div className="w-brand-wrap">
        <button
          className={`w-brand${menuOpen ? ' open-menu' : ''}`}
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          <span className="w-brand-logo">
            kūmami <small>WORLD</small>
          </span>
          <svg className="w-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {menuOpen && (
          <div className="w-brand-menu" onClick={(e) => e.stopPropagation()}>
            <div className="w-bm-head">Company</div>
            {COMPANY_LINKS.map(link => (
              <a key={link.label} href={link.href} className="w-bm-item" onClick={() => setMenuOpen(false)}>
                {link.icon}
                {link.label}
              </a>
            ))}
            <div className="w-bm-sep" />
            <button className="w-bm-item" onClick={() => { setMenuOpen(false); logout(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5V3h4" /><path d="M14 17l5-5-5-5M19 12H9" />
              </svg>
              Log out
            </button>
          </div>
        )}
      </div>

      {/* ---- Nav items ---- */}
      <nav className="w-nav-group">
        {mode === 'pro' ? (
          <>
            <div className="w-nav-label">PRO</div>
            {PRO_NAV_ITEMS.map(item => (
              <Link key={item.label} href="/world/pro" className="w-nav-item">
                {item.icon}
                <span>{item.label}</span>
                <span className="w-nav-lock">{Icons.lock}</span>
              </Link>
            ))}
          </>
        ) : (
          nav?.map(group => (
            <div key={group.grp}>
              <div className="w-nav-label">{group.grp}</div>
              {group.items.map(item => (
                <Link
                  key={item.k}
                  href={item.href}
                  className={`w-nav-item${isActive(item.href) ? ' active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))
        )}
      </nav>

      {/* ---- Footer ---- */}
      <div className="w-sidebar-foot">
        {/* Small company links in footer */}
        <div className="w-foot-links">
          {COMPANY_LINKS.slice(0, 3).map(l => (
            <a key={l.label} href={l.href} className="w-foot-link">{l.label}</a>
          ))}
        </div>

        {/* Profile */}
        <div className="w-profile">
          <span className="w-avatar">
            {currentUser?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentUser.photoURL} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--accent)' }}>
                <circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" />
              </svg>
            )}
          </span>
          <span className="w-profile-meta">
            <b>{displayName}</b>
            <span>{tierLabel}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
