'use client';

import Breadcrumb from './Breadcrumb';
import ModeToggle from './ModeToggle';
import KumaBear from '@/components/world/KumaBear';
import { useWorldMode } from '@/contexts/WorldModeContext';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { kumaOpen, setKumaOpen } = useWorldMode();

  return (
    <header className="w-topbar">
      {/* Mobile menu button */}
      <button className="w-menu-btn" aria-label="Toggle menu" onClick={onMenuClick}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Spacer */}
      <div className="w-topbar-spacer" />

      {/* Actions: Kuma FAB + Mode Toggle */}
      <div className="w-topbar-actions">
        {/* Kuma AI toggle button */}
        <button
          className={`w-kuma-fab${kumaOpen ? ' on' : ''}`}
          onClick={() => setKumaOpen(!kumaOpen)}
          title="Ask Kuma AI"
          aria-label="Toggle Kuma AI panel"
        >
          <KumaBear size={26} />
          <span className="w-kf-dot" />
        </button>

        {/* 3-way mode toggle */}
        <ModeToggle />
      </div>
    </header>
  );
}
