'use client';

/**
 * LongShortChart — dual-line chart (global solid + top-trader dashed).
 * Horizontal reference lines at 30 / 50 / 70.
 * Used in the Tier-1 Long/Short Ratio panel.
 */

import type { Series } from '@/lib/market/contracts';
import { buildLinePoints, computeDomain } from './chart-utils';

const W = 320;
const H = 100;

// Fixed domain: long/short ratio shown as % long (0–100 range, but zoom to data)
const REF_LINES = [30, 50, 70];

type Props = {
  seriesGlobal: Series;   // global long/short ratio (% long, 0–100 scale)
  seriesTop: Series;      // top-trader ratio
};

export default function LongShortChart({ seriesGlobal, seriesTop }: Props) {
  if (seriesGlobal.length === 0 && seriesTop.length === 0) {
    return <div className="w-oc-chart" style={{ height: H }} />;
  }

  // Shared domain across both series for correct alignment
  const combined = [...seriesGlobal, ...seriesTop];
  const domain = computeDomain(combined);

  // Extend domain to include reference lines if they fall outside data range
  const allRefWithin = REF_LINES.every(r => r >= domain.min && r <= domain.max);
  const extDomain = allRefWithin
    ? domain
    : {
        min: Math.min(domain.min, ...REF_LINES),
        max: Math.max(domain.max, ...REF_LINES),
      };

  const scaleYLocal = (v: number) => {
    const range = extDomain.max - extDomain.min;
    if (range === 0) return H / 2;
    return H - ((v - extDomain.min) / range) * H;
  };

  const globalPts = buildLinePoints(seriesGlobal, W, H, extDomain);
  const topPts = buildLinePoints(seriesTop, W, H, extDomain);

  return (
    <div className="w-oc-chart" style={{ width: '100%', maxWidth: W }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        aria-label="Long/Short ratio chart"
        role="img"
      >
        {/* Reference lines at 30 / 50 / 70 */}
        {REF_LINES.map(ref => {
          const y = scaleYLocal(ref);
          return (
            <g key={ref}>
              <line
                x1={0}
                y1={y}
                x2={W}
                y2={y}
                stroke="rgba(142,166,156,0.18)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={W - 2}
                y={y - 2}
                textAnchor="end"
                fill="rgba(142,166,156,0.5)"
                fontSize={9}
              >
                {ref}%
              </text>
            </g>
          );
        })}

        {/* Top-trader line — dashed */}
        {topPts && (
          <polyline
            points={topPts}
            fill="none"
            stroke="var(--purple, #b9a4ff)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Global line — solid */}
        {globalPts && (
          <polyline
            points={globalPts}
            fill="none"
            stroke="var(--accent, #00c2c7)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Legend */}
      <div className="w-oc-chart-legend">
        <span className="w-oc-legend-item w-oc-legend-solid">Global</span>
        <span className="w-oc-legend-item w-oc-legend-dashed">Top Traders</span>
      </div>
    </div>
  );
}
