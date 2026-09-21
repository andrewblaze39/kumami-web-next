'use client';

import { useEffect, useState } from 'react';
import { useMarketData } from '@/components/world/panels/useMarketData';
import { relativeTime } from '@/components/world/panels/format';
import { WIcon } from '@/components/world/panels/console-ui';
import MarketConditions from '@/components/world/panels/MarketConditions';
import RegimeChips from '@/components/world/panels/RegimeChips';
import SpotPulsePreview from '@/components/world/panels/SpotPulsePreview';
import FlowRadarFeed from '@/components/world/panels/FlowRadarFeed';
import CalendarPreview from '@/components/world/panels/CalendarPreview';
import WatchlistPreview from '@/components/world/panels/WatchlistPreview';
import AttentionPopup from '@/components/world/panels/AttentionPopup';
import ProductTour, { type TourStep } from '@/components/world/ProductTour';

const CONSOLE_TOUR: TourStep[] = [
  {
    title: 'Welcome to your dashboard 👋',
    body: "This is your daily market briefing — the whole market at a glance. Let's take a quick 60-second tour of what each part does. You can leave anytime.",
  },
  {
    selector: '[data-tour="market"]',
    title: 'Market Conditions',
    body: "The market's overall mood in one word, plus a Fear & Greed meter. When everyone's greedy, tops form; when everyone's scared, bottoms form. The colour tells you the tone.",
  },
  {
    selector: '[data-tour="regime"]',
    title: 'Asset regime chips',
    body: 'A quick report card for each major asset — price, 24h move, and whether it\'s leaning bullish, bearish, or neutral, with how confident the read is.',
  },
  {
    selector: '[data-tour="spotpulse"]',
    title: 'Spot Pulse',
    body: 'Where real money is moving right now — spot buying vs. futures leverage, five majors at a glance. Click "Open Spot Pulse" for the full grid and divergence alerts.',
  },
  {
    selector: '[data-tour="flow"]',
    title: 'Flow Radar',
    body: 'Big money leaves footprints. This is a live feed of the largest moves as they happen — whale transfers, liquidation spikes, and smart-wallet bets.',
  },
  {
    selector: '[data-tour="calendar-preview"]',
    title: 'Calendar',
    body: 'Macro prints and token unlocks landing in the next 7 days, soonest first — click through for the full calendar and filters.',
  },
  {
    selector: '[data-tour="watchlist"]',
    title: 'Watchlist',
    body: 'BTC, ETH, SOL, BNB and HYPE — always on, with a live flag when funding or positioning gets crowded. Building your own custom list is part of Pro.',
  },
  {
    title: "That's the tour! 🎉",
    body: 'Explore each product in full from the sidebar. You can replay this walkthrough anytime with the "Take a tour" button up top.',
  },
];

export default function ConsolePage() {
  const market = useMarketData();
  const [tourOpen, setTourOpen] = useState(false);

  // Auto-open once for first-time visitors (after data has loaded).
  useEffect(() => {
    if (market.status !== 'ok') return;
    try {
      if (!localStorage.getItem('kumami_tour_console_seen')) {
        const t = setTimeout(() => setTourOpen(true), 700);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage unavailable — skip auto-open */ }
  }, [market.status]);

  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem('kumami_tour_console_seen', '1'); } catch { /* ignore */ }
  };

  const isLoading = market.status === 'loading';
  const hasError = market.status === 'error' && !market.data;
  const data = market.data;

  // Real payload timestamp; undefined while loading
  const updatedAt = data?.marketConditions.updatedAt;

  if (hasError) {
    return (
      <div className="w-content-inner w-console">
        <div className="w-adv-head">
          <div>
            <h1>
              Market Intelligence{' '}
              <span className="w-pro-badge">
                <WIcon name="star" /> Plus
              </span>
            </h1>
            <p>
              Your daily market briefing — overall mood, major assets, and anything urgent, all
              in one glance.
            </p>
          </div>
        </div>
        <div className="w-console-error" role="alert">
          <p className="w-console-error-msg">
            Unable to load market data. {market.error}
          </p>
          <button className="w-btn w-btn-ghost w-btn-sm" onClick={market.refetch}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-content-inner w-console">
      {/* Page header */}
      <div className="w-adv-head">
        <div>
          <h1>
            Market Intelligence{' '}
            <span className="w-pro-badge">
              <WIcon name="star" /> Plus
            </span>
          </h1>
          <p>
            Your daily market briefing — overall mood, major assets, and anything urgent, all in
            one glance.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="w-tour-trigger" onClick={() => setTourOpen(true)}>
            <WIcon name="spark" /> Take a tour
          </button>
          <span className="w-adv-updated">
            <span className="w-live-dot" /> Live
            {updatedAt ? ` · updated ${relativeTime(updatedAt)}` : ''}
          </span>
        </div>
      </div>

      {market.status === 'error' && (
        <p className="w-console-stale-banner" role="status">
          Showing last available data — refresh failed. Will retry automatically.
        </p>
      )}

      {/* 1. Market Conditions — top anchor panel */}
      {isLoading ? (
        <div
          className="w-apanel w-span-2 w-mc-panel w-panel-skeleton w-panel-skeleton-mc"
          aria-busy="true"
        />
      ) : data ? (
        <MarketConditions data={data.marketConditions} />
      ) : null}

      {/* 2. Regime chip row */}
      <RegimeChips chips={data?.regimeChips ?? []} loading={isLoading} />

      {/* 3. Bento row 2 — On-Chain Insights + Flow Radar */}
      <div className="w-bento w-r2">
        <SpotPulsePreview />
        <FlowRadarFeed events={data?.flowRadar ?? []} loading={isLoading} />
      </div>

      {/* 4. Bento row 3 — Calendar + Watchlist */}
      <div className="w-bento w-r3">
        <CalendarPreview />
        <WatchlistPreview />
      </div>

      {tourOpen && <ProductTour steps={CONSOLE_TOUR} onClose={closeTour} />}
      <AttentionPopup />
    </div>
  );
}
