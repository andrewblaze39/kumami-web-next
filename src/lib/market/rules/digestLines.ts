/**
 * Daily Pro Digest market lines (Rachelle v1.15 Pro §1). Pure helpers so the
 * picks are unit-testable; the Digest tab feeds them the Flow Radar Pro feed.
 */

import type { FlowEvent } from '../contracts';

const DAY_MS = 24 * 3_600_000;

/** Top 3 Hyperliquid position OPENS in the last 24h, largest first. Closed positions are skipped. */
export function topSmartMoneyOpens(events: FlowEvent[], now: number, take = 3): FlowEvent[] {
  return events
    .filter((e) => e.type === 'smart_money' && e.action === 'open' && now - Date.parse(e.ts) <= DAY_MS)
    .sort((a, b) => b.amountUsd - a.amountUsd)
    .slice(0, take);
}

/** "$9.9M" / "$1.2B" — the Digest's compact amount. */
export function digestUsd(v: number): string {
  return v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1e3)}K`;
}
