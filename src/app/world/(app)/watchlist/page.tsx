'use client';

/**
 * /world/watchlist — Watchlist page.
 *
 * Pixel-parity port of the reference mockup's R.watchlist renderer,
 * including its placeholder data (WATCH_PX / COIN_NAME / ADV.radar →
 * bullishWatch()). Deliberate deviations only:
 *   - reference mint #5ee9a8 / var(--mint) → var(--accent) turquoise
 *   - KM.setMode('pro') → world mode context setMode('pro')
 */

import { useId } from 'react';
import { WIcon, coinC } from '@/components/world/panels/console-ui';
import { useWorldMode } from '@/contexts/WorldModeContext';

/* ------------------------------------------------------------------ */
/* Placeholder data — ported verbatim from the reference mockup        */
/* ------------------------------------------------------------------ */

type WatchPx = {
  price: string;
  chg: string;
  dir: 'up' | 'down';
  spark: number[];
};

const WATCH_PX: Record<string, WatchPx> = {
  BTC: { price: '$70,418', chg: '+2.1%', dir: 'up', spark: [68, 69, 68.5, 70, 69.6, 70.2, 70.4] },
  ETH: { price: '$3,642', chg: '+1.4%', dir: 'up', spark: [3.55, 3.58, 3.6, 3.59, 3.62, 3.63, 3.642] },
  SOL: { price: '$184.2', chg: '−0.8%', dir: 'down', spark: [186, 185, 184.5, 185.2, 184, 183.6, 184.2] },
  GOLD: { price: '$3,431', chg: '+1.2%', dir: 'up', spark: [3.38, 3.4, 3.41, 3.4, 3.42, 3.43, 3.431] },
  LINK: { price: '$18.94', chg: '+2.8%', dir: 'up', spark: [18.2, 18.4, 18.3, 18.6, 18.7, 18.8, 18.94] },
  BNB: { price: '$604.1', chg: '+0.6%', dir: 'up', spark: [600, 601, 603, 602, 603.5, 604, 604.1] },
  XRP: { price: '$0.612', chg: '−1.9%', dir: 'down', spark: [0.63, 0.625, 0.62, 0.618, 0.615, 0.613, 0.612] },
};

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
  HYPE: 'Hyperliquid',
};

/* Flow Radar feed (reference ADV.radar) — source for bullishWatch() */
type RadarEntry = { dir: 'in' | 'out' | 'acc'; tag: string; asset: string };

const RADAR: RadarEntry[] = [
  { dir: 'in', tag: 'Whale Deposit', asset: 'BTC' },
  { dir: 'out', tag: 'Liquidation', asset: 'ETH' },
  { dir: 'acc', tag: 'Accumulation', asset: 'SOL' },
  { dir: 'in', tag: 'Whale Deposit', asset: 'GOLD' },
  { dir: 'out', tag: 'Withdrawal', asset: 'DOGE' },
  { dir: 'acc', tag: 'Smart Money', asset: 'LINK' },
  { dir: 'in', tag: 'Whale Deposit', asset: 'BNB' },
  { dir: 'acc', tag: 'Accumulation', asset: 'XRP' },
  { dir: 'out', tag: 'Withdrawal', asset: 'BTC' },
  { dir: 'in', tag: 'Whale Deposit', asset: 'ETH' },
];

type WatchRow = WatchPx & { sym: string; name: string; signal: string };

/** Reference bullishWatch(): up to 4 unique 'in'/'acc' radar assets. */
function bullishWatch(): WatchRow[] {
  const seen: Record<string, 1> = {};
  const out: WatchRow[] = [];
  RADAR.forEach(x => {
    if ((x.dir === 'in' || x.dir === 'acc') && !seen[x.asset] && WATCH_PX[x.asset]) {
      seen[x.asset] = 1;
      const p = WATCH_PX[x.asset];
      out.push({ sym: x.asset, name: COIN_NAME[x.asset] ?? x.asset, ...p, signal: x.tag });
    }
  });
  return out.slice(0, 4);
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
  const bw = bullishWatch();

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
          your Flow Radar — the {bw.length} assets seeing the most whale inflow and accumulation
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
