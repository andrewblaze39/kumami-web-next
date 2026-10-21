/**
 * Flow Radar Pro illiquid filter — Rachelle v1.15 Pro §18.
 *
 * Hide events on coins with under $1M of 24h spot volume. The 5 core assets,
 * stablecoins and market-wide (Dry Powder) events are never hidden.
 *
 * Volume source: taker buy + sell from /api/spot/netflow-list. That list only has
 * the top ~100 coins, and the spec's "missing from the list → hide" rule would hide
 * every coin outside them (e.g. a $3M Hyperliquid position on a mid-cap). So a coin
 * missing from the list falls back to its Binance USDT-pair 24h volume (one exchange,
 * so it can only under-count); missing from both → hidden.
 * Decision: Andrew, 21 Oct 2026 ("decide for me").
 */

import type { FlowEvent } from '../contracts';
import { ANCHOR_ASSETS, STABLECOINS } from './consistentFlow';

export const MIN_SPOT_VOLUME_24H = 1_000_000;

export type SpotVolumeRow = { symbol: string; taker_buy_volume_usd_24h?: number; taker_sell_volume_usd_24h?: number };
export type BinanceTickerRow = { symbol: string; quoteVolume?: string | number };

/** symbol → 24h spot volume (buy + sell). */
export function spotVolumeMap(rows: SpotVolumeRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.symbol.toUpperCase(), Number(r.taker_buy_volume_usd_24h ?? 0) + Number(r.taker_sell_volume_usd_24h ?? 0));
  }
  return m;
}

/** base symbol → 24h quote volume of its Binance USDT pair. */
export function binanceUsdtVolumes(rows: BinanceTickerRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (!r.symbol.endsWith('USDT')) continue;
    const v = Number(r.quoteVolume ?? 0);
    if (Number.isFinite(v) && v > 0) out[r.symbol.slice(0, -4)] = v;
  }
  return out;
}

export function isLiquidEnough(
  e: Pick<FlowEvent, 'asset' | 'marketWide'>,
  volumes: Map<string, number>,
  fallback: Record<string, number> | null = null,
): boolean {
  const a = e.asset.toUpperCase();
  if (e.marketWide || ANCHOR_ASSETS.includes(a) || STABLECOINS.includes(a)) return true;
  const v = volumes.has(a) ? volumes.get(a)! : (fallback?.[a] ?? 0);
  return v >= MIN_SPOT_VOLUME_24H;
}

/** Without volume data (fetch failed) nothing is hidden — never empty the feed on an outage. */
export function filterIlliquid<T extends Pick<FlowEvent, 'asset' | 'marketWide'>>(
  events: T[],
  volumes: Map<string, number> | null,
  fallback: Record<string, number> | null = null,
): T[] {
  if (!volumes || volumes.size === 0) return events;
  return events.filter((e) => isLiquidEnough(e, volumes, fallback));
}
