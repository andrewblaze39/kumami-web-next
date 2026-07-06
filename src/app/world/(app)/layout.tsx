'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import WorldProtected from '@/components/world/shell/WorldProtected';
import { WorldModeProvider, useWorldMode } from '@/contexts/WorldModeContext';
import Sidebar from '@/components/world/shell/Sidebar';
import Topbar from '@/components/world/shell/Topbar';
import KumaDock from '@/components/world/kuma/KumaDock';

// Inner layout that has access to WorldModeContext
function AppShellInner({ children }: { children: React.ReactNode }) {
  const { kumaOpen } = useWorldMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fading, setFading] = useState(false);
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  // Crossfade when pathname changes (covers all navigation incl. mode switches)
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    // Trigger fade-out immediately, then fade back in after 150ms
    setFading(true);
    const t = setTimeout(() => setFading(false), 150);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div className="w-app" id="w-app-row">
      {/* Mobile backdrop — closes sidebar on tap */}
      <div
        className={`w-sidebar-backdrop${sidebarOpen ? ' show' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="w-main">
        <Topbar onMenuClick={() => setSidebarOpen(v => !v)} />
        {/*
          w-content-fade: base class adds opacity transition.
          w-content-fading: momentary class that drops opacity to 0, creating
          a 150ms crossfade whenever the route changes (news ↔ intel etc.).
        */}
        <div className={`w-content w-content-fade${fading ? ' w-content-fading' : ''}`}>
          {children}
        </div>
      </div>

      {/* Kuma AI dock — push-over panel, always mounted so chat state survives navigation */}
      <aside
        className={`w-kuma-side${kumaOpen ? ' open' : ''}`}
        data-side="right"
        aria-label="Kuma AI"
        role="complementary"
        aria-hidden={!kumaOpen}
        inert={!kumaOpen}
      >
        <KumaDock />
      </aside>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorldProtected>
      <WorldModeProvider>
        <AppShellInner>{children}</AppShellInner>
      </WorldModeProvider>
    </WorldProtected>
  );
}
