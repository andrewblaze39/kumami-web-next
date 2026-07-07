'use client';

/**
 * ETFFlowChart — 30D daily bars + price line overlay.
 * BTC/ETH toggle. Shows 7D-net headline stat.
 * Note: always 30D regardless of global range selector.
 */

import { useState } from 'react';
import type { Series } from '@/lib/market/contracts';
import { computeDomain, scaleX, scaleY, buildSmoothPath } from './chart-utils';
import { formatUsd } from './format';

const W = 320;
const H = 110;
const BAR_H = 70; // bars in lower portion; price line uses full height

type Props = {
  series: Series;      // ETF flow bars (positive = inflow, negative = outflow)
  seriesPrice: Series; // price overlay
  asset: string;
};

export default function ETFFlowChart({ series, seriesPrice, asset }: Props) {
  const [view, setView] = useState<'btc' | 'eth'>('btc');

  if (series.length === 0) {
    return <div className="w-oc-chart" style={{ height: H }} />;
  }

  const barDomain = computeDomain(series);
  const priceDomain = computeDomain(seriesPrice);
  const n = series.length;
  const barWidth = Math.max(2, W / n - 1.5);

  // 7D net stat from last 7 points
  const last7 = series.slice(-7);
  const net7d = last7.reduce((acc, pt) => acc + pt.v, 0);

  const pricePath = buildSmoothPath(seriesPrice, W, H, priceDomain);

  return (
    <div className="w-oc-chart-wrap">
      {/* 7D net headline */}
      <div className="w-oc-etf-stat">
        <span className="w-oc-etf-stat-label">7D Net</span>
        <span className={`w-oc-etf-stat-val ${net7d >= 0 ? 'w-bull' : 'w-bear'}`}>
          {formatUsd(net7d)}
        </span>
      </div>

      {/* BTC / ETH toggle */}
      <div className="w-oc-toggle-row">
        <div className="w-oc-toggle">
          <button
            className={`w-oc-toggle-btn${view === 'btc' ? ' on' : ''}`}
            onClick={() => setView('btc')}
          >
            BTC
          </button>
          <button
            className={`w-oc-toggle-btn${view === 'eth' ? ' on' : ''}`}
            onClick={() => setView('eth')}
          >
            ETH
          </button>
        </div>
        <span className="w-oc-note">Always 30D</span>
      </div>

      <div className="w-oc-chart">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          aria-label="ETF flow chart (30D)"
          role="img"
        >
          {/* Zero line */}
          <line
            x1={0}
            y1={scaleY(0, barDomain, BAR_H) + (H - BAR_H)}
            x2={W}
            y2={scaleY(0, barDomain, BAR_H) + (H - BAR_H)}
            stroke="rgba(142,166,156,0.25)"
            strokeWidth={1}
          />

          {/* Flow bars */}
          {series.map((pt, i) => {
            const x = scaleX(i, n, W - barWidth / 2);
            const zeroY = scaleY(0, barDomain, BAR_H) + (H - BAR_H);
            const valY = scaleY(pt.v, barDomain, BAR_H) + (H - BAR_H);
            const barTop = Math.min(zeroY, valY);
            const barHeight = Math.abs(zeroY - valY);
            const color = pt.v >= 0
              ? 'rgba(70,227,160,0.6)'
              : 'rgba(255,107,129,0.55)';
            return (
              <rect
                key={i}
                x={x}
                y={barTop}
                width={barWidth}
                height={Math.max(1, barHeight)}
                fill={color}
                rx={1}
              />
            );
          })}

          {/* Price line overlay */}
          {pricePath && (
            <path
              d={pricePath}
              fill="none"
              stroke="rgba(185,164,255,0.7)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>

      <div className="w-oc-chart-legend">
        <span className="w-oc-legend-item" style={{ color: 'rgba(70,227,160,0.9)' }}>
          Inflow
        </span>
        <span className="w-oc-legend-item" style={{ color: 'rgba(255,107,129,0.9)' }}>
          Outflow
        </span>
        <span className="w-oc-legend-item" style={{ color: 'rgba(185,164,255,0.8)' }}>
          Price
        </span>
      </div>
    </div>
  );
}
