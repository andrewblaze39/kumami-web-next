'use client';

import WorldProtected from '@/components/world/shell/WorldProtected';
import { WorldModeProvider, useWorldMode } from '@/contexts/WorldModeContext';
import Sidebar from '@/components/world/shell/Sidebar';
import Topbar from '@/components/world/shell/Topbar';

// Inner layout that has access to WorldModeContext
function AppShellInner({ children }: { children: React.ReactNode }) {
  const { kumaOpen } = useWorldMode();

  return (
    <div className="w-app" id="w-app-row">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="w-main">
        <Topbar />
        <div className="w-content">
          {children}
        </div>
      </div>

      {/* Kuma AI dock — stubbed push-over panel (Task 1.4 will fill this) */}
      {kumaOpen && (
        <aside
          className="w-kuma-side open"
          data-side="right"
          aria-label="Kuma AI"
          role="dialog"
        >
          <div className="w-kuma-placeholder">
            <p style={{ color: 'var(--muted)', padding: '24px', fontSize: 13 }}>
              Kuma AI — coming soon (Task 1.4)
            </p>
          </div>
        </aside>
      )}
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
