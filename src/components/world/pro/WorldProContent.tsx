'use client';

/**
 * WorldProContent — gated Pro dashboard content for /world/pro.
 *
 * Premium users (userData.isPremium OR role admin/superadmin) get the full Pro
 * dashboard: tabs selected via the ?tab= query param (deep links like
 * /world/pro?tab=research work), driven from the LEFT sidebar (see
 * shell/Sidebar.tsx PRO_NAV). Tabs fall into three groups:
 *   - Group A (built here from the reference design, fixture-driven): digest,
 *     followhub, airdrops, realtimenews, research, events.
 *   - spotpulse: renders the same live Spot Pulse panel as Plus (On-Chain
 *     Insights / Console preview) — one Spot Pulse for both tiers for now;
 *     the API already gives Pro the faster 15s refresh.
 *   - calendar: redirects to the single shared Calendar at /world/calendar
 *     (live feed + admin-authored pro_calendar events merged server-side), so
 *     Plus and Pro never show two different calendars. Kept as a tab key only
 *     so old ?tab=calendar links (Daily Digest, bookmarks) still land there.
 *   - Group B (data source still being wired — ComingSoon card): scanner.
 *   - Existing components re-slotted: portfolio, alpha, market, kumaai, marketcap.
 *   - addresstracker: new standalone wallet-lookup page (Kumami Pro §4) — see
 *     tabs/CryptoAddressTracker.tsx.
 * Non-premium users keep the existing teaser / whitelist page (ProTeaser).
 *
 * Retired (per the latest mockup, which drops these entirely rather than
 * showing an empty placeholder): Smart Money Tracker, Coin/Token Tracker,
 * and the Pro-tier Fear & Greed slot (that composite already lives on its
 * own Plus tab, no Pro-specific version was ever built).
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Compass } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProductTour, { type TourStep } from '@/components/world/ProductTour';
import ProTeaser from './ProTeaser';
import { ProStateProvider } from './ProState';
import { ComingSoon } from './tabs/ComingSoon';
import { DailyDigest } from './tabs/DailyDigest';
import { FollowingAlerts } from './tabs/FollowingAlerts';
import { Airdrops } from './tabs/Airdrops';
import { RealTimeNews } from './tabs/RealTimeNews';
import { KumamiResearch } from './tabs/KumamiResearch';
import SpotPulse from '@/components/world/panels/SpotPulse';
import { Events } from './tabs/Events';
import { PortfolioTab } from '@/components/ProDashboard';
import { CryptoAddressTracker } from './tabs/CryptoAddressTracker';
import AlphaRoom from '@/components/AlphaRoom';
import MarketAnalysis from '@/components/MarketAnalysis';
import KumaAIChatTab from '@/components/KumaAIChatTab';
import MarketCapTool from '@/components/MarketCapTool';
import './pro.css';

const TAB_KEYS = [
  'digest', 'followhub', 'spotpulse',
  'scanner', 'airdrops', 'portfolio', 'addresstracker', 'marketcap', 'realtimenews', 'alpha',
  'research', 'calendar', 'events', 'market', 'kumaai',
] as const;

type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(v: string | null): v is TabKey {
  return TAB_KEYS.some((k) => k === v);
}

/** Old ?tab=calendar links → the one shared Calendar page. */
function CalendarRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/world/calendar');
  }, [router]);
  return <div className="w-courses-loading">Opening Calendar…</div>;
}

function TabContent({ active }: { active: TabKey }) {
  switch (active) {
    case 'digest':
      return <DailyDigest />;
    case 'followhub':
      return <FollowingAlerts />;
    case 'airdrops':
      return <Airdrops />;
    case 'realtimenews':
      return <RealTimeNews />;
    case 'research':
      return <KumamiResearch />;
    case 'calendar':
      return <CalendarRedirect />;
    case 'events':
      return <Events />;

    // Same live Spot Pulse panel as Plus (On-Chain Insights / Console).
    case 'spotpulse':
      return (
        <div data-tour="pro-page-head">
          <SpotPulse />
        </div>
      );
    // Group B — data source being wired.
    case 'scanner':
      return (
        <ComingSoon
          eyebrow="Tools"
          icon={<Shield size={24} />}
          title="Security Scanner"
          description="Contract- and wallet-level risk scoring before you interact — honeypots, mint authority, LP locks and more."
        />
      );
    // Existing components re-slotted.
    case 'portfolio':
      return <PortfolioTab />;
    case 'addresstracker':
      return <CryptoAddressTracker />;
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
    { selector: HEAD, title: 'Daily Digest', body: 'Your morning market recap. Everything important that happened overnight across your Watchlist, Smart Money, and Alpha Room, all in one place.' },
    { title: 'How to use it', body: 'Each section links to its full tab — click “Open …” to dive into the research, news, events or airdrops behind the summary.' },
  ],
  followhub: [
    { selector: HEAD, title: 'Following & Alerts', body: "One hub for everything you follow and every alert you've set, across all your tools." },
    { selector: '[data-tour="fa-builder"]', title: 'Build an alert', body: 'Pick a ticker, choose a trigger (price / volume / sentiment) and a threshold, then click Add.' },
    { title: 'Alerts fire live', body: 'A price alert arms at the current price and flips to TRIGGERED the moment it moves past your threshold — powered by the live price feed. Use the ↻ button to re-arm at the new price.' },
  ],
  spotpulse: [
    { selector: HEAD, title: 'Spot Pulse', body: 'See where actual buying and selling is happening. Compare spot and futures activity to tell whether a move is backed by real demand or speculation.' },
    { title: 'Reading the tiles', body: 'Each tile compares spot buying, futures leverage and price for one coin and gives a verdict (e.g. REAL BUYING, SPECULATIVE, DISTRIBUTION). The banner sums up the whole market, and alert cards flag the biggest divergences.' },
    { title: 'Same engine as Plus', body: 'This is the same Spot Pulse as On-Chain Insights, refreshed faster for Pro. A second row of trending coins will be added once the data-provider plan includes per-coin spot volume.' },
  ],
  scanner: comingSoonTour('Security Scanner', "Check a token's contract before you trade. Get a quick safety check to spot risks like honeypots and potential rugs.", 'security-data provider'),
  airdrops: [
    { selector: HEAD, title: 'Airdrops & Whitelist', body: "Keep track of airdrop eligibility, whitelist spots, and important deadlines so you don't miss an opportunity." },
    { title: 'Browse & follow', body: 'Switch between the Airdrops and Whitelists tabs, click any card to open its eligibility checklist, deadline and estimated value, then Follow the ones you want to track.' },
  ],
  portfolio: [
    { title: 'AI Portfolio', body: 'Track your holdings with live pricing. Click "Add Asset" to log a coin, amount and price paid — value and 24h change update automatically from live market data.' },
    { title: 'Reading the numbers', body: 'The 24h change under your total balance is a real weighted average of every holding\'s own price move, not a flat estimate.' },
    { title: 'Portfolio risk scan', body: 'Click "Scan my portfolio" for a risk read — concentration, diversification, volatility and liquidity — with a note if your holdings changed since the last scan.' },
  ],
  addresstracker: [
    { title: 'Crypto Address Tracker', body: 'Paste any EVM wallet address to get a readable profile — portfolio value, holdings, and recent activity, computed live from on-chain data.' },
    { title: 'What\'s real vs. placeholder', body: 'Portfolio value, holdings, and recent activity are genuinely live. Realised PnL and win rate show "—" — those need a full trade-history reconstruction that isn\'t built yet.' },
  ],
  marketcap: [
    { title: 'Market Cap Comparison', body: '"What if Coin A had Coin B\'s market cap?" — pick two coins (or swap them) to see the implied price.' },
    { title: 'How it\'s calculated', body: 'Target price = Coin B\'s market cap ÷ Coin A\'s circulating supply. The table below compares price, market cap, supply, rank, ATH and FDV side by side.' },
  ],
  realtimenews: [
    { selector: HEAD, title: 'Real-Time News', body: 'Scan the latest market headlines in seconds, with a simple Bullish, Neutral, or Bearish signal for each story.' },
    { title: 'How to read it', body: 'Each row shows the exact time (and how long ago) on the left, the headline with a sentiment dot (green/red/neutral), a one-line summary, and tags — newest first.' },
  ],
  alpha: [
    { title: 'Alpha Room', body: 'Follow curated token calls, project watchlists, and high-conviction opportunities shared by the Kumami team.' },
  ],
  research: [
    { selector: HEAD, title: 'Kumami Research', body: 'Detailed research and analysis on specific tokens, sectors, narratives, and market trends.' },
    { title: 'What each call shows', body: 'Every card states a position (long/short/neutral) and asset, when it was made, the reasoning, and a “What this means for you” read.' },
  ],
  calendar: [
    { title: 'Calendar', body: 'The Calendar lives on its own page, shared by Plus and Pro — macro events, token unlocks and events added by the Kumami team.' },
  ],
  events: [
    { selector: HEAD, title: 'Events & Announcements', body: 'Discover events and join live Q&As with project teams.' },
    { title: 'Live & Q&A', body: 'When something is live you’ll see a red “Live now” badge and an embedded stream. Submit a question and upvote others’ — the list re-sorts by votes in real time.' },
    { title: 'Replays', body: 'Past events appear below with a “Watch replay” button.' },
  ],
  market: [
    { title: 'Market Analysis', body: 'In-depth market takes from the Kumami team — asset, direction (Bullish/Bearish/Rotation/On-chain) and the reasoning behind the call.' },
    { title: 'Browse the carousel', body: 'Use the arrows to move through the latest analyses, newest first.' },
  ],
  kumaai: [
    { title: 'Kuma AI Chat', body: 'A general chat assistant for market questions — create multiple rooms, each with its own conversation history.' },
    { title: 'Crypto Address Tracker', body: 'A built-in room that watches up to 20 wallets across Ethereum, Base and Arbitrum. Set a USD alert threshold per wallet and get notified of real on-chain activity — balances, transfers, NFTs.' },
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
