'use client';

/**
 * WorldProContent — gated Pro dashboard content for /world/pro.
 *
 * Premium users (userData.isPremium OR role admin/superadmin) get the new
 * dashboard views from the classic ProDashboard (AI Portfolio with the AI
 * scanner rail, Alpha Room, Market Analysis, Kuma AI Chat, Market Cap Tool).
 * Tab selection lives in the LEFT sidebar (see shell/Sidebar.tsx) and is
 * driven by the ?tab= query param so deep links like /world/pro?tab=marketcap
 * work. Non-premium users keep the existing teaser / whitelist page
 * (ProTeaser) unchanged.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProTeaser from './ProTeaser';
import { PortfolioTab } from '@/components/ProDashboard';
import AlphaRoom from '@/components/AlphaRoom';
import MarketAnalysis from '@/components/MarketAnalysis';
import KumaAIChatTab from '@/components/KumaAIChatTab';
import MarketCapTool from '@/components/MarketCapTool';

const TAB_KEYS = ['portfolio', 'alpha', 'market', 'kumaai', 'marketcap'] as const;

type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(v: string | null): v is TabKey {
  return TAB_KEYS.some((k) => k === v);
}

function WorldProInner() {
  const searchParams = useSearchParams();

  const raw = searchParams.get('tab');
  const active: TabKey = isTabKey(raw) ? raw : 'portfolio';

  return (
    <div className="w-pro-root" style={{ color: '#fff' }}>
      {active === 'portfolio' && <PortfolioTab />}
      {active === 'alpha' && (
        <div className="w-full h-full flex-1 overflow-hidden">
          <AlphaRoom />
        </div>
      )}
      {active === 'market' && (
        <div className="w-full flex flex-col min-h-[480px]">
          <MarketAnalysis />
        </div>
      )}
      {active === 'kumaai' && (
        <div className="w-full flex-1 overflow-hidden" style={{ minHeight: 400 }}>
          <KumaAIChatTab />
        </div>
      )}
      {active === 'marketcap' && (
        <div className="w-full overflow-auto">
          <MarketCapTool />
        </div>
      )}
    </div>
  );
}

export default function WorldProContent() {
  const { userData, loading } = useAuth();

  const isPremium =
    userData?.isPremium === true ||
    userData?.role === 'admin' ||
    userData?.role === 'superadmin';

  if (loading) {
    return <div className="w-courses-loading">Loading…</div>;
  }

  // Non-premium users keep the existing teaser / whitelist page unchanged.
  if (!isPremium) {
    return (
      <div className="w-content-inner">
        <ProTeaser />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="w-courses-loading">Loading…</div>}>
      <WorldProInner />
    </Suspense>
  );
}
