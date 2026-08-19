/**
 * Shared shaping helpers for the live provider.
 * Pure functions that turn raw CoinGlass rows into rule-engine inputs.
 */

import type { Series } from '../contracts';
import type { OHLC, PairMarketRow } from './cg-endpoints';

export type Dir = 'up' | 'flat' | 'down';

export type Range = '24h' | '7d' | '30d';

/** Map a UI range to a CoinGlass interval + how many points to keep. */
export function rangeToInterval(range: Range): { interval: string; points: number } {
  switch (range) {
    case '24h': return { interval: '1h', points: 24 };
    case '7d':  return { interval: '4h', points: 42 };
    case '30d': return { interval: '12h', points: 60 };
  }
}

const num = (v: string | number): number => (typeof v === 'number' ? v : parseFloat(v));

/** OHLC rows → Series using the close value. Keeps the last `points`. */
export function ohlcToSeries(rows: OHLC[] | undefined, points: number): Series {
  if (!rows || rows.length === 0) return [];
  return rows.slice(-points).map((r) => ({ t: Number(r.time), v: num(r.close) }));
}

/** Generic rows → Series via accessor. */
export function toSeries<T>(
  rows: T[] | undefined,
  points: number,
  tAccessor: (r: T) => number,
  vAccessor: (r: T) => number,
): Series {
  if (!rows || rows.length === 0) return [];
  return rows.slice(-points).map((r) => ({ t: tAccessor(r), v: vAccessor(r) }));
}

/**
 * Classify a series' net direction over its span.
 * flatThreshold is a fraction of |first| (default 1%). Series that straddle
 * zero (e.g. funding, CVD) use the absolute-delta form via `absFlat`.
 */
export function classifyDir(series: Series, flatThreshold = 0.01): Dir {
  if (series.length < 2) return 'flat';
  const first = series[0].v;
  const last = series[series.length - 1].v;
  if (first === 0) return last > 0 ? 'up' : last < 0 ? 'down' : 'flat';
  const change = (last - first) / Math.abs(first);
  if (change > flatThreshold) return 'up';
  if (change < -flatThreshold) return 'down';
  return 'flat';
}

/** Direction from a raw signed delta with an absolute flat band. */
export function dirFromDelta(delta: number, absFlat: number): Dir {
  if (delta > absFlat) return 'up';
  if (delta < -absFlat) return 'down';
  return 'flat';
}

/** Pick the highest-volume market row (usually the primary Binance pair). */
export function primaryPair(rows: PairMarketRow[] | undefined): PairMarketRow | null {
  if (!rows || rows.length === 0) return null;
  return rows.reduce((best, r) => (r.volume_usd > best.volume_usd ? r : best), rows[0]);
}

/** Sum a numeric field across market rows (e.g. total OI / volume across exchanges). */
export function sumField(rows: PairMarketRow[] | undefined, field: keyof PairMarketRow): number {
  if (!rows) return 0;
  return rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
}

/**
 * The pair symbol used by exchange-specific endpoints (gls/tls/cvd/liq-agg).
 * Aggregated endpoints (funding/oi/pairs/liq-coin-list) take the bare coin.
 */
export function pairSymbol(asset: string): string {
  return `${asset}USDT`;
}

/** Assets that have Binance USDT perps for the exchange-specific endpoints. */
const PERP_ASSETS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE', 'LINK', 'APT', 'SUI', 'XRP', 'ADA']);
export const hasPerp = (asset: string): boolean => PERP_ASSETS.has(asset.toUpperCase());

/** ISO timestamp helper for `updatedAt` fields. */
export const nowIso = (): string => new Date().toISOString();

/** Convert a unix timestamp in seconds OR ms to an ISO string. */
export function tsToIso(ts: number): string {
  const ms = ts < 1e12 ? ts * 1000 : ts;
  return new Date(ms).toISOString();
}

/** Latest close of an OHLC series as a number, or fallback. */
export function latestClose(rows: OHLC[] | undefined, fallback = 0): number {
  if (!rows || rows.length === 0) return fallback;
  return num(rows[rows.length - 1].close);
}
