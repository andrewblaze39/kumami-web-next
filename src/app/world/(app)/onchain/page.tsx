'use client';

/**
 * /world/onchain — On-Chain Insights page.
 *
 * Tier-1 (4 panels): Funding Rate, Liquidations 24H, Exchange Netflow, Long/Short Ratio
 * Tier-2 (4 panels): Heatmap, CVD, Coinbase Premium, ETF Flows
 * Tier-3 (collapsed): OI Trend, Stablecoin Supply
 *
 * Endpoints:
 *   GET /api/market/onchain?asset=<asset>&range=<range>  → OnChainPayload
 *   GET /api/market/heatmap                             → HeatmapPayload
 *
 * No thresholds / rule logic client-side — colors/labels come from payload.
 */

import { useState } from 'react';
import type { OnChainPayload, HeatmapPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import MetricPanel from '@/components/world/panels/MetricPanel';
import LongShortChart from '@/components/world/panels/LongShortChart';
import CVDChart from '@/components/world/panels/CVDChart';
import ETFFlowChart from '@/components/world/panels/ETFFlowChart';
import HeatmapFull from '@/components/world/panels/HeatmapFull';
import { buildSmoothPath, computeDomain, scaleX, scaleY } from '@/components/world/panels/chart-utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE', 'LINK', 'APT', 'SUI'] as const;
type Asset = (typeof ASSETS)[number];

const RANGES = ['24h', '7d', '30d'] as const;
type Range = (typeof RANGES)[number];

const COIN_COLORS: Record<string, string> = {
  BTC:  '#f7931a',
  ETH:  '#627eea',
  SOL:  '#9945ff',
  BNB:  '#f0b90b',
  AVAX: '#e84142',
  ARB:  '#28a0f0',
  DOGE: '#c2a633',
  LINK: '#2a5ada',
  APT:  '#5bc8f5',
  SUI:  '#4da2ff',
};

// ---------------------------------------------------------------------------
// Tiny inline SVG charts
// ---------------------------------------------------------------------------

type Pt = { t: number; v: number };

function MiniLineChart({
  series,
  color = 'var(--accent)',
  height = 44,
}: {
  series: Pt[];
  color?: string;
  height?: number;
}) {
  const W = 280;
  if (!series || series.length < 2) return <div style={{ height }} />;
  const domain = computeDomain(series);
  const path = buildSmoothPath(series, W, height, domain);
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

function MiniBarChart({ series, height = 44 }: { series: Pt[]; height?: number }) {
  const W = 280;
  if (!series || series.length === 0) return <div style={{ height }} />;
  const domain = computeDomain(series);
  const n = series.length;
  const barW = Math.max(2, W / n - 1.5);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const zeroY = clamp(scaleY(0, domain, height), 0, height);
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="rgba(142,166,156,0.2)" strokeWidth={1} />
      {series.map((pt, i) => {
        const x = scaleX(i, n, W - barW);
        const valY = scaleY(pt.v, domain, height);
        const top = Math.min(zeroY, valY);
        const bh = Math.max(1, Math.abs(zeroY - valY));
        return (
          <rect
            key={i}
            x={x}
            y={top}
            width={barW}
            height={bh}
            fill={pt.v >= 0 ? 'rgba(70,227,160,0.65)' : 'rgba(255,107,129,0.6)'}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Funding countdown — computed from wall clock, no payload timestamp needed
// ---------------------------------------------------------------------------

function fundingCountdown(): string {
  const now = Date.now();
  const intervalMs = 8 * 3600 * 1000;
  const nextFunding = Math.ceil(now / intervalMs) * intervalMs;
  const diffMs = nextFunding - now;
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// Netflow diverging bar list
// ---------------------------------------------------------------------------

function NetflowBars({ series }: { series: Pt[] }) {
  if (!series || series.length === 0) return null;
  const domain = computeDomain(series);
  const maxAbs = Math.max(Math.abs(domain.min), Math.abs(domain.max), 1);
  const bars = series.slice(-10);
  return (
    <div className="w-oc-nf-list">
      <div className="w-oc-nf-legend">
        <span className="w-bull">◀ Outflow (bullish)</span>
        <span className="w-bear">Inflow (bearish) ▶</span>
      </div>
      {bars.map((pt, i) => {
        const pct = (Math.abs(pt.v) / maxAbs) * 46;
        const isOutflow = pt.v < 0;
        return (
          <div key={i} className="w-oc-nf-row">
            <div
              className={`w-oc-nf-bar${isOutflow ? ' w-oc-nf-out' : ' w-oc-nf-in'}`}
              style={{ width: `${pct.toFixed(1)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coinbase Premium chart — line with green/red shaded zones
// ---------------------------------------------------------------------------

function PremiumChart({ series }: { series: Pt[] }) {
  const W = 320;
  const H = 90;
  if (!series || series.length < 2) return <div style={{ height: H }} />;
  const domain = computeDomain(series);
  const path = buildSmoothPath(series, W, H, domain);
  const scXl = (i: number) => scaleX(i, series.length, W);
  const scYl = (v: number) => scaleY(v, domain, H);
  const zeroY = scYl(0);

  const greenPts = series.map((pt, i) => `${scXl(i).toFixed(2)},${scYl(Math.max(0, pt.v)).toFixed(2)}`);
  const redPts   = series.map((pt, i) => `${scXl(i).toFixed(2)},${scYl(Math.min(0, pt.v)).toFixed(2)}`);
  const closeX   = scXl(series.length - 1).toFixed(2);
  const openX    = scXl(0).toFixed(2);
  const z        = zeroY.toFixed(2);

  const greenArea = `M ${openX},${z} ${greenPts.map(p => `L ${p}`).join(' ')} L ${closeX},${z} Z`;
  const redArea   = `M ${openX},${z} ${redPts.map(p => `L ${p}`).join(' ')} L ${closeX},${z} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      aria-label="Coinbase premium"
      role="img"
    >
      <path d={greenArea} fill="rgba(70,227,160,0.14)" stroke="none" />
      <path d={redArea}   fill="rgba(255,107,129,0.12)" stroke="none" />
      <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="rgba(142,166,156,0.35)" strokeWidth={1} strokeDasharray="3 3" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// OI Trend — dual-axis line + divergence shading
// ---------------------------------------------------------------------------

function OITrendChart({ seriesOI, seriesPrice }: { seriesOI: Pt[]; seriesPrice: Pt[] | null }) {
  const W = 320;
  const H = 100;
  if (!seriesOI || seriesOI.length === 0) return null;

  // Normalise both series to 0–1 so they overlay on the same axis
  const normalise = (series: Pt[]): Pt[] => {
    const mn = Math.min(...series.map(p => p.v));
    const mx = Math.max(...series.map(p => p.v));
    const range = mx - mn;
    if (range === 0) return series.map(p => ({ ...p, v: 0.5 }));
    return series.map(p => ({ ...p, v: (p.v - mn) / range }));
  };

  const normDomain = { min: 0, max: 1 };
  const normOI = normalise(seriesOI);
  const normPrice = seriesPrice && seriesPrice.length > 0 ? normalise(seriesPrice) : null;

  const oiPath = buildSmoothPath(normOI, W, H, normDomain);
  const prPath = normPrice ? buildSmoothPath(normPrice, W, H, normDomain) : null;

  // Divergence shading — shade between OI and price lines (same technique as CVDChart)
  const divPts = (() => {
    if (!normPrice) return '';
    const n = Math.min(normOI.length, normPrice.length);
    if (n === 0) return '';
    const fwd = Array.from({ length: n }, (_, i) => {
      const x = scaleX(i, n, W);
      const y = scaleY(normOI[i].v, normDomain, H);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const rev = Array.from({ length: n }, (_, i) => {
      const j = n - 1 - i;
      const x = scaleX(j, n, W);
      const y = scaleY(normPrice[j].v, normDomain, H);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return [...fwd, ...rev].join(' ');
  })();

  return (
    <div className="w-oc-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        aria-label="OI Trend"
        role="img"
      >
        {/* Divergence shading between OI and price */}
        {divPts && (
          <polygon points={divPts} fill="color-mix(in srgb, var(--accent) 7%, transparent)" stroke="none" />
        )}
        <path d={oiPath} fill="none" stroke="rgba(86,223,230,0.7)" strokeWidth={1.5} strokeDasharray="4 2" />
        {prPath && (
          <path d={prPath} fill="none" stroke="var(--accent)" strokeWidth={2} />
        )}
      </svg>
      <div className="w-oc-chart-legend">
        {normPrice && (
          <span className="w-oc-legend-item" style={{ color: 'var(--accent)' }}>Price</span>
        )}
        <span className="w-oc-legend-item" style={{ color: 'rgba(86,223,230,0.9)', fontStyle: 'italic' }}>
          OI
        </span>
        {normPrice && (
          <span className="w-oc-legend-item w-oc-legend-divergence">Divergence zone</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stablecoin supply — 90D area chart
// ---------------------------------------------------------------------------

function StablecoinChart({ series }: { series: Pt[] }) {
  const W = 320;
  const H = 80;
  if (!series || series.length < 2) return null;
  const domain = computeDomain(series);
  const path   = buildSmoothPath(series, W, H, domain);
  const scXl = (i: number) => scaleX(i, series.length, W);
  const scYl = (v: number) => scaleY(v, domain, H);
  const pts  = series.map((pt, i) => `${scXl(i).toFixed(2)},${scYl(pt.v).toFixed(2)}`);
  const areaPath = `M ${scXl(0).toFixed(2)},${H} ${pts.map(p => `L ${p}`).join(' ')} L ${scXl(series.length - 1).toFixed(2)},${H} Z`;

  return (
    <div className="w-oc-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        aria-label="Stablecoin supply"
        role="img"
      >
        <path d={areaPath} fill="color-mix(in srgb, var(--accent) 10%, transparent)" stroke="none" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.8} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OnChainPage() {
  const [asset, setAsset]         = useState<Asset>('BTC');
  const [range, setRange]         = useState<Range>('24h');
  const [tier3Open, setTier3Open] = useState(false);

  const onchainPath = `/api/market/onchain?asset=${asset}&range=${range}`;
  const heatmapPath = `/api/market/heatmap`;

  const onchain = useMarketEndpoint<OnChainPayload>(onchainPath);
  const heatmap = useMarketEndpoint<HeatmapPayload>(heatmapPath);

  const panels    = onchain.data?.panels;
  const isLoading = onchain.status === 'loading';

  // Shorthand — returns undefined when panels not yet loaded
  const p = (key: keyof NonNullable<typeof panels>) => panels?.[key];

  return (
    <div className="w-content-inner w-onchain">

      {/* ── Page header ── */}
      <div className="w-oc-head">
        <div className="w-oc-head-top">
          <div>
            <h1 className="w-page-title">On-Chain Insights</h1>
            <p className="w-oc-sub">
              Derivatives positioning, exchange flows and liquidity clusters.
            </p>
          </div>

          <div className="w-oc-controls">
            {/* Asset selector pills */}
            <div className="w-oc-asset-tabs" role="group" aria-label="Select asset">
              {ASSETS.map(a => (
                <button
                  key={a}
                  className={`w-oc-asset-btn${asset === a ? ' on' : ''}`}
                  onClick={() => setAsset(a)}
                  aria-pressed={asset === a}
                >
                  <span
                    className="w-oc-coin"
                    style={{ background: COIN_COLORS[a] ?? '#8ea69c' }}
                    aria-hidden="true"
                  >
                    {a.slice(0, 1)}
                  </span>
                  {a}
                </button>
              ))}
            </div>

            {/* Range toggle — ETF panel ignores this (always 30D) */}
            <div className="w-oc-range-toggle" role="group" aria-label="Select time range">
              {RANGES.map(r => (
                <button
                  key={r}
                  className={`w-oc-range-btn${range === r ? ' on' : ''}`}
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {onchain.status === 'error' && (
          <p className="w-console-stale-banner" role="status">
            Showing last available data — refresh failed.
          </p>
        )}
      </div>

      {/* ═══════════════════════════════════════
          TIER-1 — 4 high-prominence panels
          ═══════════════════════════════════════ */}
      <div className="w-oc-tier1">

        {/* 1. Funding Rate */}
        <MetricPanel
          title="Funding Rate"
          tooltip="Perpetual funding rate — positive means longs pay shorts. Resets every 8 hours."
          panelVerdict={p('funding')}
          loading={isLoading}
          asset={asset}
        >
          {p('funding') && (
            <>
              <div className="w-oc-big-number">
                <span className="w-oc-big-val">
                  {typeof p('funding')!.extra?.currentRatePct === 'number'
                    ? `${(p('funding')!.extra!.currentRatePct as number).toFixed(3)}%`
                    : '—'}
                </span>
                <span className="w-oc-big-sub">per 8h</span>
              </div>
              <div className="w-oc-funding-next">
                <span className="w-oc-fstat-label">Next funding in</span>
                <span className="w-oc-fstat-val w-bull">{fundingCountdown()}</span>
              </div>
              {p('funding')!.series && (
                <div className="w-oc-chart w-oc-chart-sm">
                  <MiniLineChart series={p('funding')!.series!} color="var(--gold)" />
                </div>
              )}
            </>
          )}
        </MetricPanel>

        {/* 2. Liquidations 24H */}
        <MetricPanel
          title="Liquidations 24H"
          tooltip="Total USD value of liquidated positions over the past 24 hours, split long/short."
          panelVerdict={p('liquidations')}
          loading={isLoading}
          asset={asset}
        >
          {p('liquidations') && (
            <>
              <div className="w-oc-big-number">
                <span className="w-oc-big-val w-bear">
                  {(() => {
                    const totalUsd = p('liquidations')!.extra?.totalUsd;
                    if (typeof totalUsd === 'number') {
                      return totalUsd >= 1e9
                        ? `$${(totalUsd / 1e9).toFixed(2)}B`
                        : `$${(totalUsd / 1e6).toFixed(0)}M`;
                    }
                    return '—';
                  })()}
                </span>
                <span className="w-oc-big-sub">liquidated</span>
              </div>
              {(() => {
                // Read structured longPct from extra — never fabricate a fallback
                const longPct = p('liquidations')!.extra?.longPct;
                if (typeof longPct !== 'number') return null;
                const shortPct = 100 - longPct;
                return (
                  <div className="w-oc-liq-split">
                    <div className="w-oc-liq-bar">
                      <div className="w-oc-liq-long"  style={{ width: `${longPct}%` }}  title={`Longs ${longPct}%`} />
                      <div className="w-oc-liq-short" style={{ width: `${shortPct}%` }} title={`Shorts ${shortPct}%`} />
                    </div>
                    <div className="w-oc-liq-labels">
                      <span className="w-bear">Longs {longPct}%</span>
                      <span className="w-bull">Shorts {shortPct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })()}
              {p('liquidations')!.series && (
                <div className="w-oc-chart w-oc-chart-sm">
                  <MiniBarChart series={p('liquidations')!.series!} />
                </div>
              )}
            </>
          )}
        </MetricPanel>

        {/* 3. Exchange Netflow */}
        <MetricPanel
          title="Exchange Netflow"
          tooltip="Net asset flow into/out of exchange wallets. Outflow = coins leaving exchanges = accumulation signal."
          panelVerdict={p('netflow')}
          loading={isLoading}
          asset={asset}
        >
          {p('netflow') && (
            <NetflowBars series={p('netflow')!.series ?? []} />
          )}
        </MetricPanel>

        {/* 4. Long/Short Ratio */}
        <MetricPanel
          title="Long/Short Ratio"
          tooltip="Ratio of open long to short positions. Global (solid line) vs top traders (dashed). Reference lines at 30/50/70."
          panelVerdict={p('longshort')}
          loading={isLoading}
          asset={asset}
        >
          {p('longshort') && (
            <LongShortChart
              seriesGlobal={p('longshort')!.series ?? []}
              seriesTop={p('longshort')!.series2 ?? []}
            />
          )}
        </MetricPanel>
      </div>

      {/* ═══════════════════════════════════════
          TIER-2 — 4 panels
          ═══════════════════════════════════════ */}
      <div className="w-oc-tier2">

        {/* 5. Liquidation Heatmap */}
        <MetricPanel
          title="Liquidation Heatmap"
          tooltip="Open leveraged position density by price level. High-intensity clusters are cascade risk zones."
          panelVerdict={p('heatmap')}
          loading={isLoading || heatmap.status === 'loading'}
          asset={asset}
          className="w-oc-panel-wide"
        >
          {heatmap.data ? (
            <HeatmapFull data={heatmap.data} />
          ) : heatmap.status === 'error' ? (
            <p className="w-panel-empty">Failed to load heatmap.</p>
          ) : null}
        </MetricPanel>

        {/* 6. CVD */}
        <MetricPanel
          title="Cumulative Volume Delta"
          tooltip="CVD = cumulative buy minus sell volume. Divergence from price reveals whether moves are organically bid or forced."
          panelVerdict={p('cvd')}
          loading={isLoading}
          asset={asset}
        >
          {p('cvd') && (
            <CVDChart
              seriesPrice={p('cvd')!.series ?? []}
              seriesCVD={p('cvd')!.series2 ?? []}
            />
          )}
        </MetricPanel>

        {/* 7. Coinbase Premium */}
        <MetricPanel
          title="Coinbase Premium"
          tooltip="BTC price premium on Coinbase vs global avg. Green = US buyers paying premium. Red = discount."
          panelVerdict={p('premium')}
          loading={isLoading}
          asset={asset}
        >
          {p('premium') && (
            <div className="w-oc-chart">
              <PremiumChart series={p('premium')!.series ?? []} />
            </div>
          )}
        </MetricPanel>

        {/* 8. ETF Flows — always 30D, ETF panel ignores global range */}
        <MetricPanel
          title="ETF Flows"
          subtitle="Always 30D"
          tooltip="Daily US spot ETF net inflows/outflows. Persistent green bars = institutional accumulation."
          panelVerdict={p('etf')}
          loading={isLoading}
          asset={asset}
        >
          {p('etf') && (
            <ETFFlowChart
              series={p('etf')!.series ?? []}
              seriesPrice={p('etf')!.series2 ?? []}
              net7dUsd={
                typeof p('etf')!.extra?.net7dUsd === 'number'
                  ? (p('etf')!.extra!.net7dUsd as number)
                  : undefined
              }
            />
          )}
        </MetricPanel>
      </div>

      {/* ═══════════════════════════════════════
          TIER-3 — collapsed "Show more metrics"
          ═══════════════════════════════════════ */}
      <div className="w-oc-tier3">
        <button
          className="w-oc-tier3-toggle"
          onClick={() => setTier3Open(v => !v)}
          aria-expanded={tier3Open}
        >
          <span>{tier3Open ? 'Hide' : 'Show'} more metrics</span>
          <svg
            className={`w-oc-chevron${tier3Open ? ' open' : ''}`}
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {tier3Open && (
          <div className="w-oc-tier3-panels">
            {/* OI Trend */}
            <MetricPanel
              title="Open Interest Trend"
              tooltip="Total open interest (USD). OI rising with price = healthy trend; divergence signals reversal risk."
              panelVerdict={p('oi')}
              loading={isLoading}
              asset={asset}
            >
              {p('oi') && (
                <OITrendChart
                  seriesOI={p('oi')!.series ?? []}
                  seriesPrice={p('oi')!.series2 ?? null}
                />
              )}
            </MetricPanel>

            {/* Stablecoin Supply */}
            <MetricPanel
              title="Stablecoin Supply"
              tooltip="90D stablecoin supply on exchanges. Rising = dry powder accumulating — potential buy signal forming."
              panelVerdict={p('stablecoin')}
              loading={isLoading}
              asset={asset}
            >
              {p('stablecoin') && (
                <StablecoinChart series={p('stablecoin')!.series ?? []} />
              )}
            </MetricPanel>
          </div>
        )}
      </div>
    </div>
  );
}
