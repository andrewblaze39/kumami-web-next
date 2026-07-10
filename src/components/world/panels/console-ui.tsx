'use client';

/**
 * Shared console UI helpers — icon set, coin colours and heat colours,
 * ported 1:1 from the Advanced reference mockup. The only deliberate
 * deviation is the fallback accent: the reference green #5ee9a8 becomes
 * the project turquoise via var(--accent).
 */

import type { CSSProperties } from 'react';

/* ---- Stroke icon set (24×24, stroke=currentColor, ported from reference) ---- */
const ICON_PATHS: Record<string, React.ReactNode> = {
  spark: (
    <>
      <path d="M12 3v4M12 17v4M5 5l2.5 2.5M16.5 16.5 19 19M3 12h4M17 12h4M5 19l2.5-2.5M16.5 7.5 19 5" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5M3 16.5l9 5 9-5" />
    </>
  ),
  flame: (
    <path d="M12 3c1.5 3 5 4.5 5 9a5 5 0 0 1-10 0c0-1.5.6-2.7 1.4-3.6.3 1 .9 1.6 1.6 1.6 0-3 1-5 1-7Z" />
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v4h4M9 13h6M9 17h4" />
    </>
  ),
  news: (
    <>
      <path d="M4 5h13v14H4Z" />
      <path d="M17 8h3v9a2 2 0 0 1-2 2" />
      <path d="M7 9h7M7 13h7M7 17h4" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  star: (
    <path d="m12 3 2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.8 6.6 19.4l1.2-6L3.3 9.3l6.1-.7Z" />
  ),
  arrowR: <path d="M5 12h14M13 6l6 6-6 6" />,
  bolt: <path d="M13 3 5 13h5l-1 8 8-10h-5Z" />,
  shield: <path d="M12 3 5 6v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6Z" />,
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  chevD: <path d="m6 9 6 6 6-6" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6M16.5 14.4A5.5 5.5 0 0 1 20.5 20" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5l8-2v18M12 21V9l7 2v10M4 21h16" />
      <path d="M7 8h2M7 12h2M7 16h2M15 13h1M15 17h1" />
    </>
  ),
};

export type ConsoleIconName = keyof typeof ICON_PATHS;

export function WIcon({ name }: { name: ConsoleIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ---- Coin brand colours (from reference COIN_C) ---- */
const COIN_C: Record<string, string> = {
  BTC: '#f7931a',
  ETH: '#6f8ce8',
  SOL: '#27c4a6',
  BNB: '#f0b65e',
  GOLD: '#e7c06a',
  XRP: '#9fb0bd',
  DOGE: '#d8b34a',
  AVAX: '#ff6b81',
  LINK: '#4f86ff',
  SUI: '#56dfe6',
  USDT: '#26a17b',
  USDC: '#2775ca',
  DXY: '#9aa67a',
  AI: '#b9a4ff',
  SPX: '#5b8cff',
  'S&P500': '#5b8cff',
  HYPE: '#31d0aa',
  ARB: '#5b8cff',
};

/** Reference fallback is the accent colour (#5ee9a8 → var(--accent)). */
export function coinC(sym: string): string {
  return COIN_C[sym] ?? 'var(--accent)';
}

/* ---- Treemap heat colour (from reference heatColor) ---- */
export function heatColor(chg: number): string {
  const a = Math.min(Math.abs(chg) / 4, 1);
  if (chg >= 0) {
    return `rgba(20,${Math.round(120 + 90 * a)},${Math.round(90 + 50 * a)},${0.45 + 0.5 * a})`;
  }
  return `rgba(${Math.round(150 + 90 * a)},${Math.round(40 + 30 * a)},${Math.round(60 + 30 * a)},${0.45 + 0.5 * a})`;
}

/* ---- Intel category colours (from reference INTEL_CC / cat-tag classes) ---- */
type CatStyle = { color: string; bg: string };

const CAT_STYLES: Record<string, CatStyle> = {
  Macro:      { color: '#56dfe6', bg: 'rgba(86,223,230,.13)' },
  Regulatory: { color: '#56dfe6', bg: 'rgba(86,223,230,.13)' },
  Trade:      { color: '#b9a4ff', bg: 'rgba(167,139,250,.14)' },
  Narrative:  { color: '#e7c06a', bg: 'rgba(231,192,106,.13)' },
  Security:   { color: '#ff6b81', bg: 'rgba(255,107,129,.16)' },
  // Mock-provider categories mapped onto the nearest reference palette
  'ETF Flows': { color: '#b9a4ff', bg: 'rgba(167,139,250,.14)' },
  'On-Chain':  { color: '#e7c06a', bg: 'rgba(231,192,106,.13)' },
  Protocol:    { color: '#56dfe6', bg: 'rgba(86,223,230,.13)' },
};

export function catTagStyle(category: string): CSSProperties {
  const s = CAT_STYLES[category];
  if (s) return { color: s.color, background: s.bg };
  return {
    color: 'var(--accent)',
    background: 'color-mix(in srgb, var(--accent) 13%, transparent)',
  };
}

/** Thumb gradient — reference intelGrad: linear-gradient(130deg, <catColor>3a, #0d201b) */
export function intelGrad(category: string): string {
  const s = CAT_STYLES[category];
  if (s) return `linear-gradient(130deg, ${s.color}3a, #0d201b)`;
  return 'linear-gradient(130deg, color-mix(in srgb, var(--accent) 23%, transparent), #0d201b)';
}
