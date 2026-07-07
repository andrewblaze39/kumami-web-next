/**
 * Pure SVG chart helpers for the On-Chain Insights panels.
 * No DOM dependencies — all functions are pure string/number transformers,
 * which makes them straightforwardly unit-testable.
 */

import type { Series } from '@/lib/market/contracts';

// ---------------------------------------------------------------------------
// Domain / scale helpers
// ---------------------------------------------------------------------------

export type Domain = { min: number; max: number };

/**
 * Compute the [min, max] value domain of a series.
 * Returns { min: 0, max: 1 } for empty or single-point series so callers
 * always get a usable range without division-by-zero.
 */
export function computeDomain(series: Series): Domain {
  if (series.length === 0) return { min: 0, max: 1 };
  if (series.length === 1) return { min: series[0].v - 0.5, max: series[0].v + 0.5 };

  let min = Infinity;
  let max = -Infinity;
  for (const pt of series) {
    if (pt.v < min) min = pt.v;
    if (pt.v > max) max = pt.v;
  }

  // Flat series — expand slightly so horizontal line is centred
  if (min === max) return { min: min - 0.5, max: max + 0.5 };
  return { min, max };
}

/**
 * Map a data value to an SVG y coordinate within [0, height].
 * y=0 is the top; higher values map to lower y numbers.
 */
export function scaleY(value: number, domain: Domain, height: number): number {
  const range = domain.max - domain.min;
  if (range === 0) return height / 2;
  return height - ((value - domain.min) / range) * height;
}

/**
 * Map a time index to an SVG x coordinate within [0, width].
 */
export function scaleX(index: number, total: number, width: number): number {
  if (total <= 1) return 0;
  return (index / (total - 1)) * width;
}

// ---------------------------------------------------------------------------
// Path builder
// ---------------------------------------------------------------------------

/**
 * Build an SVG polyline `points` attribute string from a Series.
 * e.g. "0,80 10,60 20,70"
 *
 * Returns an empty string for an empty series (render nothing gracefully).
 */
export function buildLinePoints(
  series: Series,
  width: number,
  height: number,
  domain?: Domain
): string {
  if (series.length === 0) return '';
  const d = domain ?? computeDomain(series);
  return series
    .map((pt, i) => {
      const x = scaleX(i, series.length, width);
      const y = scaleY(pt.v, d, height);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Build an SVG filled-area `d` attribute string.
 * The path starts at (x0, height), traces the line, then closes back at
 * (xLast, height) to form a filled region.
 */
export function buildAreaPath(
  series: Series,
  width: number,
  height: number,
  domain?: Domain
): string {
  if (series.length === 0) return '';
  const d = domain ?? computeDomain(series);

  const pts = series.map((pt, i) => ({
    x: scaleX(i, series.length, width),
    y: scaleY(pt.v, d, height),
  }));

  const start = `M ${pts[0].x.toFixed(2)},${height}`;
  const line = pts.map(p => `L ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const close = `L ${pts[pts.length - 1].x.toFixed(2)},${height} Z`;

  return `${start} ${line} ${close}`;
}

/**
 * Build a smooth SVG path using cubic bezier curves from a Series.
 * Returns a `d` attribute string. Falls back to straight lines for < 2 points.
 */
export function buildSmoothPath(
  series: Series,
  width: number,
  height: number,
  domain?: Domain
): string {
  if (series.length === 0) return '';
  const d = domain ?? computeDomain(series);

  const pts = series.map((pt, i) => ({
    x: scaleX(i, series.length, width),
    y: scaleY(pt.v, d, height),
  }));

  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  let path = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = (prev.x + curr.x) / 2;
    path += ` C ${cpX.toFixed(2)},${prev.y.toFixed(2)} ${cpX.toFixed(2)},${curr.y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`;
  }

  return path;
}
