'use client';

/**
 * WorldProContent — gated Pro dashboard content for /world/pro.
 *
 * Premium users (userData.isPremium OR role admin/superadmin) get the full Pro
 * dashboard: 18 tabs selected via the ?tab= query param (deep links like
 * /world/pro?tab=watchlist work), driven from the LEFT sidebar (see
 * shell/Sidebar.tsx PRO_SUBTABS). Tabs fall into three groups:
 *   - Group A (built here from the reference design, fixture-driven): digest,
 *     followhub, watchlist, airdrops, realtimenews, research, calendar, events.
 *   - Group B (data source still being wired — ComingSoon card): smartmoney,
 *     tokentracker, heatmap, scanner, feargreed.
 *   - Existing components re-slotted: portfolio, alpha, market, kumaai, marketcap.
 * Non-premium users keep the existing teaser / whitelist page (ProTeaser).
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, Layers, Flame, Shield, Gauge } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProTeaser from './ProTeaser';
import { ProStateProvider } from './ProState';
import { ComingSoon } from './tabs/ComingSoon';
import { DailyDigest } from './tabs/DailyDigest';
import { FollowingAlerts } from './tabs/FollowingAlerts';
import { Watchlist } from './tabs/Watchlist';
import { Airdrops } from './tabs/Airdrops';
import { RealTimeNews } from './tabs/RealTimeNews';
import { KumamiResearch } from './tabs/KumamiResearch';
import { Calendar } from './tabs/Calendar';
import { Events } from './tabs/Events';
import { PortfolioTab } from '@/components/ProDashboard';
import AlphaRoom from '@/components/AlphaRoom';
import MarketAnalysis from '@/components/MarketAnalysis';
import KumaAIChatTab from '@/components/KumaAIChatTab';
import MarketCapTool from '@/components/MarketCapTool';
import './pro.css';

const TAB_KEYS = [
  'digest', 'followhub', 'smartmoney', 'tokentracker', 'heatmap', 'watchlist',
  'scanner', 'airdrops', 'portfolio', 'marketcap', 'realtimenews', 'alpha',
  'feargreed', 'research', 'calendar', 'events', 'market', 'kumaai',
] as const;

type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(v: string | null): v is TabKey {
  return TAB_KEYS.some((k) => k === v);
}

function TabContent({ active }: { active: TabKey }) {
  switch (active) {
    case 'digest':
      return <DailyDigest />;
    case 'followhub':
      return <FollowingAlerts />;
    case 'watchlist':
      return <Watchlist />;
    case 'airdrops':
      return <Airdrops />;
    case 'realtimenews':
      return <RealTimeNews />;
    case 'research':
      return <KumamiResearch />;
    case 'calendar':
      return <Calendar />;
    case 'events':
      return <Events />;

    // Group B — data source being wired.
    case 'smartmoney':
      return (
        <ComingSoon
          eyebrow="Tools"
          icon={<Users size={24} />}
          title="Smart Money Tracker"
          description="Wallet-level flow across market makers, funds and on-chain whales — see exactly what top-PnL addresses do, as they do it."
        />
      );
    case 'tokentracker':
      return (
        <ComingSoon
          eyebrow="Tools"
          icon={<Layers size={24} />}
          title="Coin/Token Tracker"
          description="Deep per-token analytics with custom alerts on the metrics you care about."
        />
      );
    case 'heatmap':
      return (
        <ComingSoon
          eyebrow="Tools"
          icon={<Flame size={24} />}
          title="Liquidation Heatmap"
          description="Where leverage is stacked and the price levels most likely to trigger liquidation cascades."
        />
      );
    case 'scanner':
      return (
        <ComingSoon
          eyebrow="Tools"
          icon={<Shield size={24} />}
          title="Security Scanner"
          description="Contract- and wallet-level risk scoring before you interact — honeypots, mint authority, LP locks and more."
        />
      );
    case 'feargreed':
      return (
        <ComingSoon
          eyebrow="News & Signals"
          icon={<Gauge size={24} />}
          title="Fear & Greed"
          description="A multi-factor market sentiment composite, updated continuously, with the drivers behind the score."
        />
      );

    // Existing components re-slotted.
    case 'portfolio':
      return <PortfolioTab />;
    case 'alpha':
      return (
        <div className="w-full h-full flex-1 overflow-hidden">
          <AlphaRoom />
        </div>
      );
    case 'market':
      return (
        <div className="w-full flex flex-col min-h-[480px]">
          <MarketAnalysis />
        </div>
      );
    case 'kumaai':
      return (
        <div className="w-full flex-1 overflow-hidden" style={{ minHeight: 400 }}>
          <KumaAIChatTab />
        </div>
      );
    case 'marketcap':
      return (
        <div className="w-full overflow-auto">
          <MarketCapTool />
        </div>
      );
    default:
      return <DailyDigest />;
  }
}

function WorldProInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const active: TabKey = isTabKey(raw) ? raw : 'digest';

  return (
    <ProStateProvider>
      <div className="w-pro-root" style={{ color: '#fff' }}>
        <TabContent active={active} />
      </div>
    </ProStateProvider>
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
