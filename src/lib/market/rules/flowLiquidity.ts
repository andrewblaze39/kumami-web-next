/**
 * Flow Radar Pro illiquid filter — Rachelle v1.15 Pro §18.
 *
 * Hide events on coins with under $1M of 24h spot volume (taker buy + sell from
 * /api/spot/netflow-list), or that are missing from that list. The 5 core assets,
 * stablecoins and market-wide (Dry Powder) events are never hidden.
 *
 * Note: netflow-list returns the top ~100 coins, so "missing from the list" hides
 * everything outside them — as the spec asks.
 */

import type { FlowEvent } from '../contracts';
import { ANCHOR_ASSETS, STABLECOINS } from './consistentFlow';

export const MIN_SPOT_VOLUME_24H = 1_000_000;

export type SpotVolumeRow = { symbol: string; taker_buy_volume_usd_24h?: number; taker_sell_volume_usd_24h?: number };

/** symbol → 24h spot volume (buy + sell). */
export function spotVolumeMap(rows: SpotVolumeRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.symbol.toUpperCase(), Number(r.taker_buy_volume_usd_24h ?? 0) + Number(r.taker_sell_volume_usd_24h ?? 0));
  }
  return m;
}

export function isLiquidEnough(e: Pick<FlowEvent, 'asset' | 'marketWide'>, volumes: Map<string, number>): boolean {
  const a = e.asset.toUpperCase();
  if (e.marketWide || ANCHOR_ASSETS.includes(a) || STABLECOINS.includes(a)) return true;
  return (volumes.get(a) ?? 0) >= MIN_SPOT_VOLUME_24H;
}

/** Without volume data (fetch failed) nothing is hidden — never empty the feed on an outage. */
export function filterIlliquid<T extends Pick<FlowEvent, 'asset' | 'marketWide'>>(events: T[], volumes: Map<string, number> | null): T[] {
  if (!volumes || volumes.size === 0) return events;
  return events.filter((e) => isLiquidEnough(e, volumes));
}
