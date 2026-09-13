'use client';

/**
 * Mobile-only bottom tab bar (≤760px, see .w-mobile-tabbar in world.css).
 * Surfaces the 4 most-used destinations instead of duplicating the full
 * sidebar nav: Home, the current mode's primary tool, Kuma AI, and Menu
 * (which opens the existing sidebar drawer — no separate nav tree to maintain).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Newspaper, LayoutDashboard, Sparkles, Menu } from 'lucide-react';
import { useWorldMode } from '@/contexts/WorldModeContext';
import KumaBear from '@/components/world/KumaBear';

interface MobileTabBarProps {
  onMenuClick: () => void;
}

const PRIMARY_BY_MODE = {
  beginner: { href: '/world/news', label: 'News', icon: Newspaper },
  advanced: { href: '/world/console', label: 'Console', icon: LayoutDashboard },
  pro: { href: '/world/pro', label: 'Pro', icon: Sparkles },
} as const;

export default function MobileTabBar({ onMenuClick }: MobileTabBarProps) {
  const pathname = usePathname();
  const { mode, kumaOpen, setKumaOpen } = useWorldMode();
  const primary = PRIMARY_BY_MODE[mode];
  const PrimaryIcon = primary.icon;

  const isHome = pathname === '/world/home';
  const isPrimary = pathname.startsWith(primary.href);

  return (
    <nav className="w-mobile-tabbar" aria-label="Primary">
      <Link href="/world/home" className={`w-mtb-item${isHome ? ' active' : ''}`}>
        <Home size={20} strokeWidth={2.2} />
        <span>Home</span>
      </Link>
      <Link href={primary.href} className={`w-mtb-item${isPrimary ? ' active' : ''}`}>
        <PrimaryIcon size={20} strokeWidth={2.2} />
        <span>{primary.label}</span>
      </Link>
      <button
        type="button"
        className={`w-mtb-item w-mtb-kuma${kumaOpen ? ' active' : ''}`}
        onClick={() => setKumaOpen(!kumaOpen)}
        aria-label="Toggle Kuma AI"
      >
        <KumaBear size={22} />
        <span>Kuma</span>
      </button>
      <button type="button" className="w-mtb-item" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} strokeWidth={2.2} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
