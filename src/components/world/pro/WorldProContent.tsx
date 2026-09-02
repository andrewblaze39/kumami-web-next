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

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, Layers, Flame, Shield, Gauge, Compass } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProductTour, { type TourStep } from '@/components/world/ProductTour';
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

// Per-tab guided tours: "Take a tour" explains the page the user is currently on.
const HEAD = '[data-tour="pro-page-head"]';

const comingSoonTour = (title: string, what: string, source: string): TourStep[] => [
  { selector: HEAD, title, body: what },
  { title: 'Coming soon', body: `This tab is designed and in place — it lights up as soon as we connect the ${source}. There's nothing to do here yet.` },
];

const PRO_TAB_TOURS: Record<TabKey, TourStep[]> = {
  digest: [
    { selector: HEAD, title: 'Daily Digest', body: 'Your landing tab — a live roll-up of the newest items across every other Pro tab.' },
    { title: 'How to read it', body: 'Each section shows the latest research, news, upcoming calendar events and active airdrops. Click “Open …” under a section to jump straight to that full tab.' },
  ],
  followhub: [
    { selector: HEAD, title: 'Following & Alerts', body: 'Set live price alerts and keep everything you follow in one place.' },
    { selector: '[data-tour="fa-builder"]', title: 'Build an alert', body: 'Pick a ticker, choose a trigger (price / volume / sentiment) and a threshold, then click Add.' },
    { title: 'Alerts fire live', body: 'A price alert arms at the current price and flips to TRIGGERED the moment it moves past your threshold — powered by the live Binance feed. Use the ↻ button to re-arm at the new price.' },
    { title: 'Following', body: 'Anything you Follow elsewhere (an airdrop, a wallet, an alpha item) appears in the Following list below your alerts.' },
  ],
  smartmoney: comingSoonTour('Smart Money Tracker', 'Wallet-level flow of top-PnL addresses — see what smart money is doing as it happens.', 'on-chain analytics provider'),
  tokentracker: comingSoonTour('Coin/Token Tracker', 'Deep per-token analytics with custom alerts on the metrics you care about.', 'market-data provider'),
  heatmap: comingSoonTour('Liquidation Heatmap', 'Where leverage is stacked and the price levels most likely to trigger cascades.', 'CoinGlass feed'),
  watchlist: [
    { selector: HEAD, title: 'Watchlist', body: 'Track any ticker you care about — your list saves to your account and syncs across devices.' },
    { selector: '[data-tour="wl-add"]', title: 'Add a ticker', body: 'Type a symbol (e.g. BTC) and press Add or Enter. Remove one with the ✕ on its row.' },
    { title: 'Live prices', body: 'Prices show “—” for now; live prices and smart-money auto-curation arrive with the market-data feed.' },
  ],
  scanner: comingSoonTour('Security Scanner', 'Contract- and wallet-level risk scoring before you interact — honeypots, mint authority, LP locks and more.', 'security-data provider'),
  airdrops: [
    { selector: HEAD, title: 'Airdrops & Whitelist', body: 'Curated drops and whitelist access, each with an eligibility checklist and deadline.' },
    { title: 'Browse & follow', body: 'Switch between the Airdrops and Whitelists tabs, click any card to open its eligibility checklist, deadline and estimated value, then Follow the ones you want to track.' },
  ],
  portfolio: [
    { title: 'AI Portfolio', body: 'Your portfolio manager — track holdings and performance. Add positions and Kumami surfaces insights on them here.' },
  ],
  marketcap: [
    { title: 'Market Cap Comparison', body: 'Compare assets side by side by market cap and other metrics to size up relative value.' },
  ],
  realtimenews: [
    { selector: HEAD, title: 'Real-Time News', body: 'Every headline that matters, stripped to scan speed.' },
    { title: 'How to read it', body: 'Each row shows the exact time (and how long ago) on the left, the headline with a sentiment dot (green/red/neutral), a one-line summary, and tags — newest first.' },
  ],
  alpha: [
    { title: 'Alpha Room', body: 'Real-time curated alpha as a live chat feed — the moment something matters, with a one-line read on why. Newest messages appear at the bottom.' },
  ],
  feargreed: comingSoonTour('Fear & Greed', 'A multi-factor market-sentiment composite, updated continuously, with the drivers behind the score.', 'CoinGlass feed'),
  research: [
    { selector: HEAD, title: 'Kumami Research', body: 'KOL-led calls from our analysts, with accountability built in.' },
    { title: 'What each card shows', body: 'Every call states a position (long/short/neutral) and asset, when it was made, the reasoning, and a “What this means for you” read.' },
  ],
  calendar: [
    { selector: HEAD, title: 'Calendar', body: 'Macro prints, token unlocks and network upgrades on one calendar.' },
    { title: 'How to use it', body: 'Move between months with the arrows; click a day’s chip or an item in the Upcoming list to see its impact, category and details.' },
  ],
  events: [
    { selector: HEAD, title: 'Events & Announcements', body: 'Live sessions and AMAs you can watch, replay and ask questions in.' },
    { title: 'Live & Q&A', body: 'When something is live you’ll see a red “Live now” badge and an embedded stream. Submit a question and upvote others’ — the list re-sorts by votes in real time.' },
    { title: 'Replays', body: 'Past events appear below with a “Watch replay” button.' },
  ],
  market: [
    { title: 'Market Analysis', body: 'In-depth market analysis and write-ups published by the Kumami team.' },
  ],
  kumaai: [
    { title: 'Kuma AI Chat', body: 'Ask Kuma anything about the market — it’s your AI assistant, right inside the Pro dashboard.' },
  ],
};

function WorldProInner() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const active: TabKey = isTabKey(raw) ? raw : 'digest';
  const [tourOpen, setTourOpen] = useState(false);

  const steps = PRO_TAB_TOURS[active] ?? [
    { title: 'Kumami Pro', body: 'Explore this tab, then use the sidebar to move between the rest of your Pro tools.' },
  ];

  return (
    <ProStateProvider>
      <div className="w-pro-root" style={{ color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button type="button" className="w-tour-trigger" onClick={() => setTourOpen(true)}>
            <Compass size={14} /> Take a tour
          </button>
        </div>
        <TabContent active={active} />
      </div>
      {tourOpen && (
        <ProductTour key={active} steps={steps} onClose={() => setTourOpen(false)} />
      )}
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
