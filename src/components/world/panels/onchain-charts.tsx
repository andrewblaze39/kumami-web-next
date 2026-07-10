'use client';

/**
 * On-Chain chart helpers — ported 1:1 from the reference mockup
 * (ocRnd / ocSeries / ocPts / ocPoly / ocDual / ocBars / ocArea / hmCol).
 * Seeded-random math is identical to the reference so the chart shapes
 * match exactly. The only deliberate deviation: the reference default
 * stroke/fill #5ee9a8 (mint) becomes var(--accent).
 */

import { useId } from 'react';

/* ---- Seeded PRNG (FNV-1a hash + LCG, identical to reference) ---- */
export function ocRnd(seed: string): () => number {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    s ^= seed.charCodeAt(i);
    s = Math.imul(s, 16777619) >>> 0;
  }
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function ocSeries(
  seed: string,
  n: number,
  base: number,
  vol: number,
  drift?: number
): number[] {
  const r = ocRnd(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (r() - 0.5) * vol + (drift || 0);
    out.push(v);
  }
  return out;
}

function ocPts(series: number[], W: number, H: number, pad: number): [number, number][] {
  const max = Math.max(...series),
    min = Math.min(...series),
    rng = max - min || 1,
    step = W / (series.length - 1);
  return series.map((v, i) => [
    +(i * step).toFixed(1),
    +(H - pad - ((v - min) / rng) * (H - 2 * pad)).toFixed(1),
  ]);
}

const ocPoly = (pts: [number, number][]) => pts.map((p) => p[0] + ',' + p[1]).join(' ');

export type OcDivType = 'acc' | 'dist' | 'none';

/* ---- Dual line chart with divergence region fill (reference ocDual) ---- */
export function OcDual({
  a,
  b,
  h,
  divType,
  primary,
}: {
  a: number[];
  b: number[];
  h?: number;
  divType?: OcDivType;
  primary?: string;
}) {
  const W = 340,
    H = h || 118,
    pad = 12;
  const pa = ocPts(a, W, H, pad),
    pb = ocPts(b, W, H, pad);
  const fc =
    divType === 'acc' ? '#46e3a0' : divType === 'dist' ? '#ff6b81' : 'var(--accent)';
  const fo = divType && divType !== 'none' ? 0.17 : 0.05;
  const region = ocPoly(pa) + ' ' + ocPoly(pb.slice().reverse());
  const pc = primary || 'var(--accent)';
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <polygon points={region} fill={fc} opacity={fo} />
      <polyline
        points={ocPoly(pb)}
        fill="none"
        stroke="rgba(255,255,255,.4)"
        strokeWidth={1.4}
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={ocPoly(pa)}
        fill="none"
        stroke={pc}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ---- Diverging bar chart with optional price overlay (reference ocBars) ---- */
export function OcBars({ vals, price, h }: { vals: number[]; price?: number[]; h?: number }) {
  const W = 340,
    H = h || 118,
    pad = 8,
    max = Math.max(...vals.map(Math.abs)) || 1,
    zeroY = H / 2,
    bw = W / vals.length;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <line
        x1={0}
        y1={zeroY}
        x2={W}
        y2={zeroY}
        stroke="rgba(255,255,255,.14)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {vals.map((v, i) => {
        const bh = Math.max(1, (Math.abs(v) / max) * (H / 2 - pad)),
          x = i * bw + bw * 0.16,
          w = bw * 0.68,
          y = v >= 0 ? zeroY - bh : zeroY,
          col = v >= 0 ? '#46e3a0' : '#ff6b81';
        return (
          <rect
            key={i}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            width={w.toFixed(1)}
            height={bh.toFixed(1)}
            rx={1.5}
            fill={col}
            opacity=".92"
          />
        );
      })}
      {price && (
        <polyline
          points={ocPoly(ocPts(price, W, H, pad))}
          fill="none"
          stroke="rgba(255,255,255,.5)"
          strokeWidth={1.4}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/* ---- Gradient area chart with optional zero line (reference ocArea) ---- */
export function OcArea({
  series,
  color,
  zeroVal,
  h,
}: {
  series: number[];
  color?: string;
  zeroVal?: number;
  h?: number;
}) {
  // Sanitised — React useId can contain characters not valid inside url(#…)
  const gid = 'ocg' + useId().replace(/[^a-zA-Z0-9-]/g, '');
  const W = 340,
    H = h || 118,
    pad = 12,
    pts = ocPts(series, W, H, pad),
    col = color || 'var(--accent)';
  let zy = H;
  let zeroLine: React.ReactNode = null;
  if (zeroVal !== undefined) {
    const max = Math.max(...series),
      min = Math.min(...series),
      rng = max - min || 1;
    zy = H - pad - ((zeroVal - min) / rng) * (H - 2 * pad);
    zeroLine = (
      <line
        x1={0}
        y1={zy.toFixed(1)}
        x2={W}
        y2={zy.toFixed(1)}
        stroke="rgba(255,255,255,.24)"
        strokeWidth={1}
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
    );
  }
  const area = `0,${zy.toFixed(1)} ` + ocPoly(pts) + ` ${W},${zy.toFixed(1)}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity=".3" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      {zeroLine}
      <polyline
        points={ocPoly(pts)}
        fill="none"
        stroke={col}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ---- Heatmap cell colour ramp (reference hmCol — semantic heat colours) ---- */
export function hmCol(v: number): string {
  if (v < 0.12) return 'rgba(34,60,50,.5)';
  const t = Math.min(v, 1);
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const k = t / 0.5;
    r = Math.round(38 + 202 * k);
    g = Math.round(206 - 6 * k);
    b = Math.round(150 - 58 * k);
  } else {
    const k = (t - 0.5) / 0.5;
    r = Math.round(240 + 15 * k);
    g = Math.round(200 - 118 * k);
    b = Math.round(92 + 16 * k);
  }
  return `rgba(${r},${g},${b},${(0.5 + 0.48 * t).toFixed(2)})`;
}
