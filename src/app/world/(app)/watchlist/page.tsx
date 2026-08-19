'use client';

/**
 * /world/watchlist — Watchlist page.
 *
 * Live: consumes /api/market/watchlist (WatchlistApiResponse). The auto-detected
 * `assets` list (ranked bullish flow, capped to tier slots) drives the table.
 * Falls back to a clean loading/empty state. UI shell unchanged from the port.
 */

import { useId } from 'react';
import { WIcon, coinC } from '@/components/world/panels/console-ui';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { formatPrice, formatChange } from '@/components/world/panels/format';
import { useWorldMode } from '@/contexts/WorldModeContext';
import type { WatchlistApiResponse } from '@/lib/market/contracts';

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
  spark: number[];
};

/** Deterministic 7-point sparkline that trends in the given direction. */
function synthSpark(sym: string, dir: 'up' | 'down'): number[] {
  let seed = 0;
  for (const c of sym) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const slope = dir === 'up' ? 0.12 : -0.12;
  return Array.from({ length: 7 }, (_, i) => 1 + i * slope + (rnd() - 0.5) * 0.08);
}

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
      spark: synthSpark(a.asset, dir),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Sparkline — reference sparkline() helper (same viewBox/stroke math) */
/* ------------------------------------------------------------------ */

function Sparkline({
  pts,
  color,
  w = 130,
  h = 34,
}: {
  pts: number[];
  color: string;
  w?: number;
  h?: number;
}) {
  const id = useId();
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const rng = max - min || 1;
  const step = w / (pts.length - 1);
  const xy = pts.map((p, i) => [i * step, h - ((p - min) / rng) * (h - 4) - 2]);
  const line = xy.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = `0,${h} ` + line + ` ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function WatchlistPage() {
  const { setMode } = useWorldMode();
  const market = useMarketEndpoint<WatchlistApiResponse>('/api/market/watchlist');
  const bw = market.data ? toRows(market.data.assets) : [];
  const loading = market.status === 'loading';

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
      </div>

      {/* ── Flow bar ── */}
      <div className="w-wl-flowbar">
        <WIcon name="flame" />
        <span>Ranked by bullish on-chain flow · refreshes with the radar</span>
        <span className="w-wl-auto">Auto</span>
      </div>

      {/* ── Table ── */}
      <div className="w-wl-table">
        <div className="w-wl-thead">
          <span>Asset</span>
          <span>Price</span>
          <span className="w-h-24h">24h</span>
          <span className="w-sig-col">Flow signal</span>
          <span>7d</span>
        </div>
        {loading && (
          <div className="w-wl-trow" role="status">
            <div className="w-wl-asset w-muted">Loading live watchlist…</div>
            <div /><div /><div /><div />
          </div>
        )}
        {!loading && bw.length === 0 && (
          <div className="w-wl-trow" role="status">
            <div className="w-wl-asset w-muted">No bullish flow signals right now.</div>
            <div /><div /><div /><div />
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
            <div style={{ width: 64 }}>
              <Sparkline pts={w.spark} color={w.dir === 'up' ? '#46e3a0' : '#ff6b81'} w={64} h={28} />
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
      <div className="w-apanel w-locked" style={{ marginTop: 16, minHeight: 120 }}>
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
    </div>
  );
}
