'use client';

import Breadcrumb from './Breadcrumb';
import ModeToggle from './ModeToggle';
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
          {/* Kuma mascot bear face simplified SVG */}
          <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <radialGradient id="kg-tb" cx="42%" cy="36%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e8eef0" />
              </radialGradient>
            </defs>
            <circle cx="74" cy="74" r="30" fill="url(#kg-tb)" />
            <circle cx="74" cy="74" r="14" fill="#d7dee0" />
            <circle cx="166" cy="74" r="30" fill="url(#kg-tb)" />
            <circle cx="166" cy="74" r="14" fill="#d7dee0" />
            <ellipse cx="120" cy="118" rx="86" ry="80" fill="url(#kg-tb)" />
            <circle cx="92" cy="108" r="8.5" fill="#0c1b16" />
            <circle cx="148" cy="108" r="8.5" fill="#0c1b16" />
            <circle cx="89" cy="105" r="2.6" fill="#fff" />
            <circle cx="145" cy="105" r="2.6" fill="#fff" />
            <ellipse cx="120" cy="150" rx="40" ry="32" fill="#f3ece1" />
            <ellipse cx="120" cy="134" rx="11" ry="8" fill="#0c1b16" />
            <path d="M120 142v9M120 151c0 7-8 10-13 7M120 151c0 7 8 10 13 7" stroke="#0c1b16" strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="62" cy="138" r="9" fill="#ffd1dc" opacity=".55" />
            <circle cx="178" cy="138" r="9" fill="#ffd1dc" opacity=".55" />
          </svg>
          <span className="w-kf-dot" />
        </button>

        {/* 3-way mode toggle */}
        <ModeToggle />
      </div>
    </header>
  );
}
