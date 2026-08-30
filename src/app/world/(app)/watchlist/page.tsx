'use client';

/**
 * /world/watchlist — Watchlist page.
 *
 * Live: consumes /api/market/watchlist (WatchlistApiResponse). The auto-detected
 * `assets` list (ranked bullish flow, capped to tier slots) drives the table.
 * Falls back to a clean loading/empty state. UI shell unchanged from the port.
 */

import { useEffect, useState } from 'react';
import { WIcon, coinC } from '@/components/world/panels/console-ui';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { formatPrice, formatChange } from '@/components/world/panels/format';
import { useWorldMode } from '@/contexts/WorldModeContext';
import ProductTour, { type TourStep } from '@/components/world/ProductTour';
import type { WatchlistApiResponse } from '@/lib/market/contracts';

const WATCHLIST_TOUR: TourStep[] = [
  {
    title: 'Your auto-watchlist 👋',
    body: 'No setup needed — this list builds itself from the strongest bullish money flow. Quick tour? Leave anytime.',
  },
  {
    selector: '[data-tour="wl-flowbar"]',
    title: 'Ranked by bullish flow',
    body: 'Assets are ordered by the whale inflow and accumulation showing up on your Flow Radar — it refreshes as the radar does. "Auto" means you never curate it by hand.',
  },
  {
    selector: '[data-tour="wl-table"]',
    title: 'Price, move & flow signal',
    body: 'Each row shows the live price, 24h move, and the single strongest flow signal that put it on the list — so you know why it is here.',
  },
  {
    selector: '[data-tour="wl-alerts"]',
    title: 'Alerts are a Pro upgrade',
    body: 'Pin your own tokens, set a custom order, and get pushed the moment a tracked asset moves or a watched wallet acts — all part of Pro.',
  },
  {
    title: "That's your Watchlist 🎉",
    body: 'Replay anytime with the "Take a tour" button. Explore the other tools from the sidebar.',
  },
];

const COIN_NAME: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  GOLD: 'Gold (RWA)',
  LINK: 'Chainlink',
  BNB: 'BNB Chain',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  AVAX: 'Avalanche',
  ADA: 'Cardano',
  SUI: 'Sui',
  HYPE: 'Hyperliquid',
};

type WatchRow = {
  sym: string;
  name: string;
  price: string;
  chg: string;
  dir: 'up' | 'down';
  signal: string;
};

/** Map the live payload assets into display rows. */
function toRows(assets: WatchlistApiResponse['assets']): WatchRow[] {
  return assets.map((a) => {
    const dir: 'up' | 'down' = a.change24h >= 0 ? 'up' : 'down';
    const signal = a.actionTags[0]?.label ?? a.regime;
    return {
      sym: a.asset,
      name: COIN_NAME[a.asset] ?? a.asset,
      price: `$${formatPrice(a.price)}`,
      chg: formatChange(a.change24h),
      dir,
      signal,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function WatchlistPage() {
  const { setMode } = useWorldMode();
  const market = useMarketEndpoint<WatchlistApiResponse>('/api/market/watchlist');
  const bw = market.data ? toRows(market.data.assets) : [];
  const loading = market.status === 'loading';
  const [tourOpen, setTourOpen] = useState(false);

  // Auto-open once for first-time visitors.
  useEffect(() => {
    try {
      if (!localStorage.getItem('kumami_tour_watchlist_seen')) {
        const t = setTimeout(() => setTourOpen(true), 700);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage unavailable — skip auto-open */ }
  }, []);

  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem('kumami_tour_watchlist_seen', '1'); } catch { /* ignore */ }
  };

  return (
    <div className="w-content-inner w-watchlist">
      {/* ── Page head ── */}
      <div className="w-page-head">
        <div className="w-ptag">Watchlist</div>
        <h1>
          <WIcon name="bookmark" /> Watchlist
        </h1>
        <p>
          Auto-curated from the strongest <b style={{ color: 'var(--accent)' }}>bullish flow</b> on
          your Flow Radar — the assets seeing the most whale inflow and accumulation
          right now. Building your own custom list, price alerts and notes is part of{' '}
          <b style={{ color: 'var(--purple)' }}>Pro</b>.
        </p>
        <button type="button" className="w-tour-trigger" onClick={() => setTourOpen(true)} style={{ marginTop: 10 }}>
          <WIcon name="spark" /> Take a tour
        </button>
      </div>

      {/* ── Flow bar ── */}
      <div className="w-wl-flowbar" data-tour="wl-flowbar">
        <WIcon name="flame" />
        <span>Ranked by bullish on-chain flow · refreshes with the radar</span>
        <span className="w-wl-auto">Auto</span>
      </div>

      {/* ── Table ── */}
      <div className="w-wl-table" data-tour="wl-table">
        <div className="w-wl-thead">
          <span>Asset</span>
          <span>Price</span>
          <span className="w-h-24h">24h</span>
          <span className="w-sig-col">Flow signal</span>
        </div>
        {loading && (
          <div className="w-wl-trow" role="status">
            <div className="w-wl-asset w-muted">Loading live watchlist…</div>
            <div /><div /><div />
          </div>
        )}
        {!loading && bw.length === 0 && (
          <div className="w-wl-trow" role="status">
            <div className="w-wl-asset w-muted">No bullish flow signals right now.</div>
            <div /><div /><div />
          </div>
        )}
        {bw.map(w => (
          <div key={w.sym} className="w-wl-trow">
            <div className="w-wl-asset">
              <span className="w-coin" style={{ background: coinC(w.sym) }}>
                {w.sym[0]}
              </span>
              <span>
                <b>{w.sym}</b>
                <span>{w.name}</span>
              </span>
            </div>
            <div>
              <b style={{ fontWeight: 800 }}>{w.price}</b>
            </div>
            <div className="w-c-24h">
              <span className={w.dir === 'up' ? 'w-bull' : 'w-bear'} style={{ fontWeight: 800 }}>
                {w.chg}
              </span>
            </div>
            <div className="w-wl-acts">
              <span className="w-wl-sig">
                <WIcon name="flame" /> {w.signal}
              </span>
            </div>
          </div>
        ))}
        <div className="w-wl-cap">
          <span className="w-lk-sm">
            <WIcon name="lock" />
          </span>
          <span>
            Custom watchlists are a <b style={{ color: 'var(--purple)' }}>Pro</b> feature — pin any
            token or wallet and set your own order.
          </span>
          <button
            className="w-btn w-btn-pro w-btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setMode('pro')}
          >
            <WIcon name="bolt" /> Customize with Pro
          </button>
        </div>
      </div>

      {/* ── Locked alerts panel ── */}
      <div className="w-apanel w-locked" data-tour="wl-alerts" style={{ marginTop: 16, minHeight: 120 }}>
        <div className="w-lock-blur" style={{ padding: 20 }}>
          <div className="w-apanel-h" style={{ padding: '0 0 14px', border: 'none' }}>
            <span className="w-ttl">
              <span className="w-ic">
                <WIcon name="shield" />
              </span>{' '}
              Price &amp; whale alerts
            </span>
          </div>
          <p className="w-muted" style={{ fontSize: 13, margin: 0 }}>
            Get pushed the moment a tracked asset moves or a watched wallet acts.
          </p>
        </div>
        <div className="w-lock-veil">
          <span className="w-lk">
            <WIcon name="lock" />
          </span>
          <b>Alerts are a Pro feature</b>
          <span>Real-time alerts on major market moves</span>
        </div>
      </div>

      {tourOpen && <ProductTour steps={WATCHLIST_TOUR} onClose={closeTour} />}
    </div>
  );
}
