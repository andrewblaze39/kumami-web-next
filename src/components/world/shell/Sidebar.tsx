'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
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
  grp: string;             // group key; used as React key and (unless standalone) as the header label
  items: NavItem[];
  collapsible?: boolean;   // render a clickable header that expands/collapses the items
  standalone?: boolean;    // render items as plain top-level links with no header
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
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" />
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3.5 20.5 7 8 19.5 3.5 20.5 4.5 16 17 3.5Z" /><path d="m14.5 6 3.5 3.5" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  ),
};

const BEGINNER_NAV: NavGroup[] = [
  {
    grp: 'news',
    standalone: true,
    items: [
      { k: 'news', label: 'News Portal', href: '/world/news', icon: Icons.news },
    ],
  },
  {
    grp: 'Education',
    collapsible: true,
    items: [
      { k: 'edu-journey', label: 'My Journey', href: '/world/education?tab=journey', icon: Icons.book },
      { k: 'edu-dashboard', label: 'Dashboard', href: '/world/education?tab=dashboard', icon: Icons.home },
      { k: 'edu-courses', label: 'My Courses', href: '/world/education?tab=courses', icon: Icons.grad },
      { k: 'edu-achievements', label: 'Achievements', href: '/world/education?tab=achievements', icon: Icons.trophy },
    ],
  },
  {
    grp: 'Dictionary',
    collapsible: true,
    items: [
      { k: 'edu-research', label: 'Tokenpedia', href: '/world/education?tab=research', icon: Icons.doc },
      { k: 'edu-glossary', label: 'Glossary', href: '/world/education?tab=glossary', icon: Icons.book },
    ],
  },
  {
    grp: 'apps',
    standalone: true,
    items: [
      { k: 'ailabs', label: 'AI Labs', href: '/world/ailabs', icon: Icons.flask },
      { k: 'games', label: 'Games', href: '/world/games', icon: Icons.game },
    ],
  },
];

const ADV_NAV: NavGroup[] = [
  {
    grp: 'Plus',
    collapsible: true,
    items: [
      { k: 'console', label: 'Console', href: '/world/console', icon: Icons.home },
      { k: 'onchain', label: 'On-Chain Insights', href: '/world/onchain', icon: Icons.layers },
      { k: 'intel', label: 'Intelligence', href: '/world/intel', icon: Icons.doc },
      { k: 'watchlist', label: 'Watchlist', href: '/world/watchlist', icon: Icons.bookmark },
    ],
  },
];

// Education subtabs — no longer rendered as nested subnav; education items
// are now direct nav items under Learn/Explore groups.

// PRO subtabs (premium users) — keys must match ?tab= read by WorldProContent.
// Content for each panel follows the Kumami World Pro reference design.
const PRO_SUBTABS = [
  { key: 'digest', label: 'Daily Digest', icon: Icons.doc },
  { key: 'followhub', label: 'Following & Alerts', icon: Icons.bookmark },
  { key: 'smartmoney', label: 'Smart Money Tracker', icon: Icons.users },
  { key: 'tokentracker', label: 'Coin/Token Tracker', icon: Icons.layers },
  { key: 'spotpulse', label: 'Spot Pulse', icon: Icons.layers },
  { key: 'scanner', label: 'Security Scanner', icon: Icons.shield },
  { key: 'airdrops', label: 'Airdrops & Whitelist', icon: Icons.spark },
  // NOTE: no Watchlist here — it's a Plus tool (/world/watchlist) that Pro
  // users already see via the included Plus nav, so it isn't duplicated in Pro.
  { key: 'portfolio', label: 'AI Portfolio', icon: Icons.trophy },
  { key: 'marketcap', label: 'Market Cap Comparison', icon: Icons.layers },
  { key: 'realtimenews', label: 'Real-Time News', icon: Icons.news },
  { key: 'alpha', label: 'Alpha Room', icon: Icons.bolt },
  { key: 'feargreed', label: 'Fear & Greed', icon: Icons.spark },
  { key: 'research', label: 'Kumami Research', icon: Icons.doc },
  { key: 'calendar', label: 'Calendar', icon: Icons.clock },
  { key: 'events', label: 'Events & Announcements', icon: Icons.bell },
  { key: 'market', label: 'Market Analysis', icon: Icons.doc },
  { key: 'kumaai', label: 'Kuma AI Chat', icon: Icons.spark },
] as const;

/**
 * Pro sub-nav (premium users) — reads ?tab= to highlight the active tab
 * (default: portfolio) while on /world/pro. Needs useSearchParams, so it is
 * mounted inside <Suspense/>.
 */
function ProSubnav({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const active = pathname === '/world/pro'
    ? (PRO_SUBTABS.some(t => t.key === raw) ? raw : 'digest')
    : null;

  return (
    <>
      {PRO_SUBTABS.map(t => (
        <Link
          key={t.key}
          href={`/world/pro?tab=${t.key}`}
          data-tour={`pro-${t.key}`}
          className={`w-nav-item${active === t.key ? ' active' : ''}`}
          aria-current={active === t.key ? 'page' : undefined}
          onClick={onClose}
        >
          {t.icon}
          <span>{t.label}</span>
        </Link>
      ))}
    </>
  );
}

/**
 * Renders one nav group's links, highlighting the active item. Education
 * items share the /world/education path but differ by ?tab=, so beyond the
 * path match we also compare that (a missing ?tab= on the URL means the
 * default "dashboard" tab) — needs useSearchParams, so it is mounted inside
 * <Suspense/>.
 */
function NavGroupList({ groups, onClose }: { groups: NavGroup[]; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Collapsed group headers, by group key. Default: all expanded.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const isNavActive = (item: NavItem) => {
    const [path, query] = item.href.split('?');
    if (!pathname.startsWith(path)) return false;
    if (!query) return true;
    const itemTab = new URLSearchParams(query).get('tab') || 'dashboard';
    const activeTab = searchParams.get('tab') || 'dashboard';
    return itemTab === activeTab;
  };

  const toggle = (grp: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(grp)) next.delete(grp);
      else next.add(grp);
      return next;
    });

  const renderItem = (item: NavItem) => (
    <Link
      key={item.k}
      href={item.href}
      className={`w-nav-item${isNavActive(item) ? ' active' : ''}`}
      onClick={onClose}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );

  return (
    <>
      {groups.map(group => {
        // Standalone: plain top-level links, no header.
        if (group.standalone) {
          return <div key={group.grp}>{group.items.map(renderItem)}</div>;
        }

        // Collapsible: clickable header with a caret that toggles the items.
        if (group.collapsible) {
          const isCollapsed = collapsed.has(group.grp);
          return (
            <div key={group.grp} className="w-nav-section">
              <button
                type="button"
                className={`w-nav-label w-nav-label-btn${isCollapsed ? ' collapsed' : ''}`}
                onClick={() => toggle(group.grp)}
                aria-expanded={!isCollapsed}
              >
                <span>{group.grp}</span>
                <svg className="w-nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {!isCollapsed && group.items.map(renderItem)}
            </div>
          );
        }

        // Fallback: static labelled group.
        return (
          <div key={group.grp}>
            <div className="w-nav-label">{group.grp}</div>
            {group.items.map(renderItem)}
          </div>
        );
      })}
    </>
  );
}

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

/**
 * PRO nav section — shown as the primary group in Pro mode, and reused as a
 * greyed-out/locked teaser at the bottom of Beginner and Advanced mode so
 * non-premium users see what Pro unlocks. Premium users get real shortcuts
 * (ProSubnav) in every mode instead of a locked teaser.
 */
function ProNavSection({ isPremium, onClose }: { isPremium: boolean; onClose: () => void }) {
  return (
    <div>
      <div className="w-nav-label">Pro</div>
      {isPremium ? (
        <Suspense fallback={null}>
          <ProSubnav onClose={onClose} />
        </Suspense>
      ) : (
        PRO_NAV_ITEMS.map(item => (
          <Link key={item.label} href="/world/pro" className="w-nav-item locked" onClick={onClose}>
            {item.icon}
            <span>{item.label}</span>
            <span className="w-nav-lock">{Icons.lock}</span>
          </Link>
        ))
      )}
    </div>
  );
}

// Brand dropdown menu links
const COMPANY_LINKS = [
  { label: 'About Kumami', href: '/world/about', icon: Icons.building },
  { label: 'Our Partners', href: '/world/partners', icon: Icons.users },
  { label: 'Blogs', href: '/world/blogs', icon: Icons.pen },
];

interface SidebarProps {
  sidebarOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ sidebarOpen, onClose }: SidebarProps) {
  const { mode } = useWorldMode();
  const { currentUser, userData, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Refs for click-outside detection on the brand dropdown
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuDropRef = useRef<HTMLDivElement>(null);

  // Refs for click-outside detection on the profile dropdown (bottom of sidebar)
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const profileDropRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click-outside or Escape
  useEffect(() => {
    if (!profileOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileBtnRef.current && profileBtnRef.current.contains(target)) return;
      if (profileDropRef.current && profileDropRef.current.contains(target)) return;
      setProfileOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileOpen]);

  // Close brand dropdown on click-outside or Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuBtnRef.current && menuBtnRef.current.contains(target)
      ) return; // click on toggle button itself — let onClick handler toggle
      if (
        menuDropRef.current && menuDropRef.current.contains(target)
      ) return; // click inside dropdown — leave open
      setMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Build inclusive nav: higher tiers see their own tabs + all lower-tier tabs.
  // Pro = PRO + ADV + BEGINNER, Advanced = ADV + BEGINNER, Beginner = BEGINNER only.
  const primaryNav = mode === 'beginner' ? BEGINNER_NAV : mode === 'advanced' ? ADV_NAV : null;
  const includedNav: NavGroup[] | null = mode === 'advanced' ? BEGINNER_NAV : mode === 'pro' ? [...ADV_NAV, ...BEGINNER_NAV] : null;

  // Premium predicate — same as WorldProContent's gate.
  const isPremium =
    userData?.isPremium === true ||
    userData?.role === 'admin' ||
    userData?.role === 'superadmin';

  const isActive = (href: string) => pathname.startsWith(href);

  // Admin roles — same predicate as the legacy Navbar / AdminOnlyRoute.
  const isAdminRole =
    userData?.role === 'superadmin' ||
    userData?.role === 'admin' ||
    userData?.role === 'newsresearchadmin' ||
    userData?.role === 'gamesadmin' ||
    userData?.role === 'marketanalysisadmin' ||
    userData?.role === 'newsdrafter';

  // Determine display name + avatar initials (1-2 letters)
  const displayName = userData?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'You';
  const initials = (() => {
    const source = userData?.displayName || currentUser?.displayName;
    if (source) {
      const parts = source.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    const email = currentUser?.email;
    if (email) return email.slice(0, 2).toUpperCase();
    return 'K';
  })();
  const modeLabel = mode === 'pro' ? 'Pro' : mode === 'advanced' ? 'Plus' : 'Basic';

  return (
    <aside className={`w-sidebar${mode === 'advanced' ? ' is-adv' : mode === 'pro' ? ' is-pro' : ''}${sidebarOpen ? ' open' : ''}`} id="w-sidebar">

      {/* ---- Brand / logo + dropdown ---- */}
      <div className="w-brand-wrap">
        <button
          ref={menuBtnRef}
          className={`w-brand${menuOpen ? ' open-menu' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          <span className="w-brand-logo">
            <Image
              src="/logo-kumami-final.png"
              alt="Kumami World"
              width={84}
              height={36}
              style={{ height: 36, width: 'auto' }}
              priority
            />
          </span>
          <span className={`w-mode-badge w-mode-badge-${mode}`}>
            {mode === 'pro' ? 'PRO' : mode === 'advanced' ? 'PLUS' : 'BASIC'}
          </span>
          <svg className="w-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {menuOpen && (
          <div ref={menuDropRef} className="w-brand-menu">
            <div className="w-bm-head">Company</div>
            {COMPANY_LINKS.map(link => (
              <Link key={link.label} href={link.href} className="w-bm-item" onClick={() => setMenuOpen(false)}>
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ---- Home (all modes, directly under brand) ---- */}
      <div className="w-nav-about">
        <Link
          href="/world/home"
          className={`w-nav-item${isActive('/world/home') ? ' active' : ''}`}
          onClick={onClose}
        >
          {Icons.info}
          <span>Home</span>
        </Link>
      </div>

      {/* ---- Nav items ---- */}
      <nav className="w-nav-group">
        {/* Primary nav for current mode */}
        {mode === 'pro' ? (
          <ProNavSection isPremium={isPremium} onClose={onClose} />
        ) : (
          primaryNav && (
            <Suspense fallback={null}>
              <NavGroupList groups={primaryNav} onClose={onClose} />
            </Suspense>
          )
        )}

        {/* Included lower-tier nav groups (fully active — lower tiers are
            already accessible from Advanced/Pro mode) */}
        {includedNav && includedNav.length > 0 && (
          <>
            <div className="w-nav-divider" />
            <Suspense fallback={null}>
              <NavGroupList groups={includedNav} onClose={onClose} />
            </Suspense>
          </>
        )}
      </nav>

      {/* ---- Footer: profile block — dropdown with My Profile + Log out ---- */}
      <div className="w-sidebar-foot">
        {profileOpen && (
          <div ref={profileDropRef} className="w-profile-menu">
            {isAdminRole && (
              <Link
                href="/admin"
                className="w-bm-item"
                onClick={() => { setProfileOpen(false); onClose(); }}
              >
                {Icons.shield}
                Admin Dashboard
              </Link>
            )}
            <Link
              href="/world/profile"
              className="w-bm-item"
              onClick={() => { setProfileOpen(false); onClose(); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
              </svg>
              My Profile
            </Link>
            <button
              className="w-bm-item"
              onClick={() => { setProfileOpen(false); logout(); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5V3h4" /><path d="M14 17l5-5-5-5M19 12H9" />
              </svg>
              Log out
            </button>
          </div>
        )}
        <button
          ref={profileBtnRef}
          type="button"
          className="w-profile"
          onClick={() => setProfileOpen(v => !v)}
          aria-expanded={profileOpen}
          aria-haspopup="true"
        >
          <span className="w-avatar">
            {currentUser?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentUser.photoURL} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'var(--accent)' }}>{initials}</span>
            )}
          </span>
          <span className="w-profile-meta">
            <b>{displayName}</b>
            <span>{modeLabel}</span>
          </span>
          <svg className={`w-caret${profileOpen ? ' up' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
