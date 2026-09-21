'use client';

/**
 * /world/fear-greed — standalone Fear & Greed Index tab (Plus tier).
 *
 * Composite gauge + 5 sub-metric tiles, all scored server-side (rules live in
 * fearGreedComposite.ts) — this page only renders what it's given.
 */

import { useMemo, useState } from 'react';
import type { FearGreedPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { WIcon } from '@/components/world/panels/console-ui';
import { formatUsd } from '@/components/world/panels/format';
import { scaleX, scaleY, buildSmoothPath, buildAreaPath, type Domain } from '@/components/world/panels/chart-utils';

/** Fixed score bands, top to bottom — index score is always 0-100, so the
 *  chart's colour bands are fixed thresholds, never a data-dependent range. */
const BANDS = [
  { from: 76, to: 100, label: 'EXTREME GREED', display: 'Extreme Greed', color: '#46e3a0' },
  { from: 56, to: 76, label: 'GREED', display: 'Greed', color: '#8fd6b4' },
  { from: 44, to: 56, label: 'NEUTRAL', display: 'Neutral', color: '#8ea69c' },
  { from: 24, to: 44, label: 'FEAR', display: 'Fear', color: '#f0cd7e' },
  { from: 0, to: 24, label: 'EXTREME FEAR', display: 'Extreme Fear', color: '#ff6b81' },
];
const SCORE_DOMAIN: Domain = { min: 0, max: 100 };

const RANGES = ['7D', '30D', '90D', '1Y'] as const;
type Range = (typeof RANGES)[number];
const RANGE_DAYS: Record<Range, number> = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };

const GAUGE_SIZE = 120;
const GAUGE_STROKE = 10;
const GAUGE_R = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

const COLOR_HEX: Record<string, string> = {
  green: '#46e3a0',
  'grey-green': '#8fd6b4',
  grey: '#8ea69c',
  amber: '#f0cd7e',
  'grey-red': '#d69aa4',
  red: '#ff6b81',
};

const TONE_CLASS: Record<string, string> = {
  green: 'w-bull',
  'grey-green': 'w-bull',
  grey: 'w-muted',
  amber: 'w-flat',
  'grey-red': 'w-bear',
  red: 'w-bear',
};

function Gauge({ score, color }: { score: number; color: string }) {
  const dash = (Math.max(0, Math.min(100, score)) / 100) * GAUGE_CIRC;
  return (
    <svg width={GAUGE_SIZE} height={GAUGE_SIZE} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`} aria-hidden="true">
      <circle
        cx={GAUGE_SIZE / 2}
        cy={GAUGE_SIZE / 2}
        r={GAUGE_R}
        fill="none"
        stroke="var(--adv-border)"
        strokeWidth={GAUGE_STROKE}
      />
      <circle
        cx={GAUGE_SIZE / 2}
        cy={GAUGE_SIZE / 2}
        r={GAUGE_R}
        fill="none"
        stroke={COLOR_HEX[color] ?? '#8ea69c'}
        strokeWidth={GAUGE_STROKE}
        strokeDasharray={`${dash} ${GAUGE_CIRC - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
      />
    </svg>
  );
}

export default function FearGreedPage() {
  const { status, data } = useMarketEndpoint<FearGreedPayload>('/api/market/fear-greed');
  const [range, setRange] = useState<Range>('7D');
  const [howOpen, setHowOpen] = useState(false);

  const history = data?.history ?? [];
  const filteredHistory = useMemo(() => history.slice(-RANGE_DAYS[range]), [history, range]);

  const W = 640, H = 220;
  const domain = SCORE_DOMAIN;
  const path = filteredHistory.length ? buildSmoothPath(filteredHistory, W, H, domain) : '';
  const areaPath = filteredHistory.length ? buildAreaPath(filteredHistory, W, H, domain) : '';

  if (status === 'loading') {
    return (
      <div className="w-content-inner">
        <div className="w-panel-skeleton" style={{ minHeight: 400 }} aria-busy="true" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-content-inner">
        <p className="w-panel-empty">Couldn&apos;t load the Fear &amp; Greed Index right now.</p>
      </div>
    );
  }

  const { composite, subMetrics } = data;
  const tone = TONE_CLASS[composite.color] ?? 'w-muted';

  return (
    <div className="w-content-inner">
      <div className="w-crypto-head">
        <div className="w-ptag">Fear &amp; Greed</div>
        <h1>
          <WIcon name="spark" /> Fear &amp; Greed Index
        </h1>
        <p className="w-crypto-sub">A composite of five sourced, dated factors — not a bare number.</p>
      </div>

      <div className="w-fg-hero">
        {composite.unavailable ? (
          <Gauge score={0} color="grey" />
        ) : (
          <Gauge score={composite.score} color={composite.color} />
        )}
        <div className="w-fg-hero-score">
          {composite.unavailable ? (
            <b className="w-muted">No data</b>
          ) : (
            <>
              <b className={tone}>{composite.score}</b>
              <span className={tone}>{composite.label}</span>
            </>
          )}
        </div>
        <div className="w-fg-hero-desc">
          <div className="w-fg-hero-title">Kumami Index · BTC, ETH, SOL, BNB, HYPE</div>
          <p>
            {composite.unavailable
              ? 'All 5 underlying signals failed to load — showing no data rather than a false reading.'
              : 'Composite of price momentum, long/short sentiment, volatility, market composition and news tone.'}
          </p>
        </div>
      </div>

      <div className="w-fg-tiles">
        <div className="w-fg-tile">
          <span className="w-fg-tile-label">Price Momentum</span>
          {subMetrics.priceMomentum.unavailable ? (
            <b className="w-muted">No data</b>
          ) : (
            <b>{subMetrics.priceMomentum.score}</b>
          )}
          <span className="w-fg-tile-source">{subMetrics.priceMomentum.source}</span>
        </div>
        <div className="w-fg-tile">
          <span className="w-fg-tile-label">Long/Short Sentiment</span>
          {subMetrics.longShortSentiment.unavailable ? (
            <b className="w-muted">No data</b>
          ) : (
            <b>{subMetrics.longShortSentiment.value}% Long</b>
          )}
          <span className="w-fg-tile-source">{subMetrics.longShortSentiment.source}</span>
        </div>
        <div className="w-fg-tile">
          <span className="w-fg-tile-label">Volatility · 7D vs 30D</span>
          {subMetrics.volatility.unavailable ? (
            <b className="w-muted">No data</b>
          ) : (
            <b>{subMetrics.volatility.value}</b>
          )}
          <span className="w-fg-tile-source">{subMetrics.volatility.source}</span>
        </div>
        <div className="w-fg-tile">
          <span className="w-fg-tile-label">Market Composition</span>
          {subMetrics.marketComposition.unavailable ? (
            <b className="w-muted">No data</b>
          ) : (
            <b className={Number(subMetrics.marketComposition.value) >= 0 ? 'w-bull' : 'w-bear'}>
              {formatUsd(Number(subMetrics.marketComposition.value))}
            </b>
          )}
          <span className="w-fg-tile-source">{subMetrics.marketComposition.source}</span>
        </div>
        <div className="w-fg-tile">
          <span className="w-fg-tile-label">News Tone</span>
          {subMetrics.newsTone.unavailable ? (
            <b className="w-muted">No data</b>
          ) : (
            <b>
              {subMetrics.newsTone.estimated && <span className="w-fg-estimated-badge">Estimated</span>} {subMetrics.newsTone.value}% pos
            </b>
          )}
          <span className="w-fg-tile-source">{subMetrics.newsTone.source}</span>
        </div>
      </div>

      <button className="w-fg-how-toggle" onClick={() => setHowOpen((v) => !v)}>
        How this works {howOpen ? '▲' : '▼'}
      </button>
      {howOpen && (
        <div className="w-fg-how-body">
          <p>
            Every number above is a weighted blend of 5 signals: Price Momentum (30%), Long/Short Sentiment (20%),
            Volatility (15%), Market Composition (20%), and News Tone (15%). Each is scored 0–100, then combined into
            the composite score shown in the gauge. News Tone is currently an estimated keyword heuristic over live
            headlines — it&apos;ll be replaced with a validated AI classifier.
          </p>
        </div>
      )}

      <section className="w-apanel w-fg-chart-panel" aria-label="Fear & Greed history">
        <div className="w-apanel-h">
          <div>
            <span className="w-ttl">Crypto Fear &amp; Greed Index</span>
            <div className="w-sub">Index history over the selected range</div>
          </div>
          <div className="w-flow-radar-timeframe">
            {RANGES.map((r) => (
              <button key={r} className={r === range ? 'on' : ''} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="w-apanel-b w-fg-chart-wrap">
          {filteredHistory.length === 0 ? (
            <p className="w-panel-empty">No history available yet.</p>
          ) : (
            <div className="w-fg-chart-row">
              <div className="w-fg-chart-axis">
                {BANDS.map((b) => (
                  <span key={b.label} style={{ top: scaleY(b.to, domain, H) }}>
                    <b style={{ color: b.color }}>{b.to}</b> {b.label}
                  </span>
                ))}
                <span style={{ top: scaleY(0, domain, H) }}><b style={{ color: BANDS[BANDS.length - 1].color }}>0</b></span>
              </div>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                height={H}
                role="img"
                aria-label="Fear and Greed index history, colour-coded by band"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="fgBandGradient" x1="0" y1="0" x2="0" y2="1">
                    {BANDS.map((b) => (
                      <stop key={b.label} offset={`${100 - b.to}%`} stopColor={b.color} stopOpacity={0.28} />
                    ))}
                    <stop offset="100%" stopColor={BANDS[BANDS.length - 1].color} stopOpacity={0.28} />
                  </linearGradient>
                </defs>
                {BANDS.map((b) => (
                  <rect
                    key={b.label}
                    x={0}
                    y={scaleY(b.to, domain, H)}
                    width={W}
                    height={scaleY(b.from, domain, H) - scaleY(b.to, domain, H)}
                    fill={b.color}
                    opacity={0.08}
                  />
                ))}
                {[24, 44, 56, 76].map((band) => (
                  <line
                    key={band}
                    x1={0}
                    y1={scaleY(band, domain, H)}
                    x2={W}
                    y2={scaleY(band, domain, H)}
                    stroke="rgba(255,255,255,0.14)"
                    strokeDasharray="3 3"
                  />
                ))}
                <path d={areaPath} fill="url(#fgBandGradient)" stroke="none" />
                <path d={path} fill="none" stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
                <circle
                  cx={scaleX(filteredHistory.length - 1, filteredHistory.length, W)}
                  cy={scaleY(filteredHistory[filteredHistory.length - 1].v, domain, H)}
                  r={4}
                  fill="#fff"
                  stroke={COLOR_HEX[composite.color] ?? 'var(--accent)'}
                  strokeWidth={2}
                />
              </svg>
            </div>
          )}
        </div>
        <div className="w-fg-band-legend">
          {BANDS.map((b) => (
            <span key={b.label}><i style={{ background: b.color }} /> {b.display} · {b.from}–{b.to}</span>
          ))}
        </div>
      </section>

      <p className="w-fg-disclaimer">This index is a regime read, not a trade recommendation.</p>
    </div>
  );
}
