'use client';

/**
 * CVDChart — dual-line (price vs CVD) with shaded divergence zone.
 * Futures only — spot CVD series is not available from the current provider.
 * The Futures/Spot toggle has been removed to avoid dead UI.
 */

import type { Series } from '@/lib/market/contracts';
import { buildSmoothPath, computeDomain, scaleX, scaleY } from './chart-utils';

const W = 320;
const H = 110;

type Props = {
  /** Price series (series from payload) */
  seriesPrice: Series;
  /** CVD series (series2 from payload) */
  seriesCVD: Series;
};

export default function CVDChart({ seriesPrice, seriesCVD }: Props) {
  if (seriesPrice.length === 0) {
    return <div className="w-oc-chart" style={{ height: H }} />;
  }

  // Normalise both series to 0–1 scale so they can overlay on the same SVG
  const normalise = (series: Series): Series => {
    const d = computeDomain(series);
    const range = d.max - d.min;
    if (range === 0) return series.map(pt => ({ ...pt, v: 0.5 }));
    return series.map(pt => ({ ...pt, v: (pt.v - d.min) / range }));
  };

  const normPrice = normalise(seriesPrice);
  const normCVD = normalise(seriesCVD);
  const normDomain = { min: 0, max: 1 };

  const pricePath = buildSmoothPath(normPrice, W, H, normDomain);
  const cvdPath = buildSmoothPath(normCVD, W, H, normDomain);

  // Divergence zone: shade between price and CVD lines
  // Build filled polygon by tracing price forward then CVD backward
  const divergencePoints = (): string => {
    const n = Math.min(normPrice.length, normCVD.length);
    if (n === 0) return '';
    const fwd = Array.from({ length: n }, (_, i) => {
      const x = scaleX(i, n, W);
      const y = scaleY(normPrice[i].v, normDomain, H);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const rev = Array.from({ length: n }, (_, i) => {
      const j = n - 1 - i;
      const x = scaleX(j, n, W);
      const y = scaleY(normCVD[j].v, normDomain, H);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return [...fwd, ...rev].join(' ');
  };

  const divPts = divergencePoints();

  return (
    <div className="w-oc-chart-wrap">
      <div className="w-oc-chart">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="none"
          aria-label="CVD vs Price chart (Futures)"
          role="img"
        >
          {/* Divergence shading */}
          {divPts && (
            <polygon
              points={divPts}
              fill="rgba(94,233,168,0.07)"
              stroke="none"
            />
          )}

          {/* CVD line */}
          <path
            d={cvdPath}
            fill="none"
            stroke="rgba(86,223,230,0.7)"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            strokeLinejoin="round"
          />

          {/* Price line */}
          <path
            d={pricePath}
            fill="none"
            stroke="var(--accent, #5ee9a8)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="w-oc-chart-legend">
        <span className="w-oc-legend-item" style={{ color: 'var(--accent)' }}>
          Price
        </span>
        <span className="w-oc-legend-item" style={{ color: 'rgba(86,223,230,0.9)' }}>
          CVD
        </span>
        <span className="w-oc-legend-item w-oc-legend-divergence">
          Divergence zone
        </span>
      </div>
    </div>
  );
}
