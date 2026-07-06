'use client';

import { useState } from 'react';
import WorldProtected from '@/components/world/shell/WorldProtected';
import { WorldModeProvider, useWorldMode } from '@/contexts/WorldModeContext';
import Sidebar from '@/components/world/shell/Sidebar';
import Topbar from '@/components/world/shell/Topbar';
import KumaDock from '@/components/world/kuma/KumaDock';

// Inner layout that has access to WorldModeContext
function AppShellInner({ children }: { children: React.ReactNode }) {
  const { kumaOpen } = useWorldMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        <div className="w-content">
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
