'use client';

/**
 * ProTabs — gated Pro dashboard container for /world/pro.
 *
 * Premium users (userData.isPremium OR role admin/superadmin) get the subtab
 * bar: Portfolio | Alpha Room | Market Analysis | Market Cap — ports of the
 * CRA Pro Dashboard tabs. Non-premium users keep the existing teaser /
 * whitelist page (ProTeaser) unchanged.
 *
 * Subtab state is driven by the ?tab= query param (mirrors EducationTabs) so
 * deep links like /world/pro?tab=marketcap work.
 */

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProTeaser from './ProTeaser';
import PortfolioTab from './PortfolioTab';
import AlphaRoomTab from './AlphaRoomTab';
import MarketAnalysisTab from './MarketAnalysisTab';

const TABS = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'alpha', label: 'Alpha Room' },
  { key: 'market', label: 'Market Analysis' },
  { key: 'marketcap', label: 'Market Cap' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function isTabKey(v: string | null): v is TabKey {
  return TABS.some((t) => t.key === v);
}

function ProTabsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const raw = searchParams.get('tab');
  const active: TabKey = isTabKey(raw) ? raw : 'portfolio';

  const selectTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    router.replace(`/world/pro?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-pro-tabs-root">
      <nav
        className="w-np-cats w-edu-subtabs"
        role="tablist"
        aria-label="Pro dashboard sections"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={`w-np-cat${active === t.key ? ' is-active' : ''}`}
            onClick={() => selectTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {active === 'portfolio' && <PortfolioTab />}
      {active === 'alpha' && <AlphaRoomTab />}
      {active === 'market' && <MarketAnalysisTab />}
    </div>
  );
}

export default function ProTabs() {
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
    return <ProTeaser />;
  }

  return (
    <Suspense fallback={<div className="w-courses-loading">Loading…</div>}>
      <ProTabsInner />
    </Suspense>
  );
}
