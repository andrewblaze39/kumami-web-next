/**
 * Daily Pro Digest market lines (Rachelle v1.15 Pro §1). Pure helpers so the
 * picks are unit-testable; the Digest tab feeds them the Flow Radar Pro feed.
 */

import type { CalendarEvent, FlowEvent } from '../contracts';
import { isAirdropEvent } from './calendarEvents';

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

/**
 * The Digest's Calendar section: the next 3 team-added events from today on, soonest date
 * first. Fed by /api/market/calendar, which has already applied the viewer's audience flags
 * and kept airdrops Pro-only, so this only picks — it never re-filters by tier. Feed prints
 * and airdrop TGEs are left out, as before (airdrops have their own Digest section).
 */
export function digestCalendarRows(events: CalendarEvent[], now: number, take = 3): { id: string; label: string; meta: string }[] {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  return events
    .filter((e) => e.source === 'kumami' && !isAirdropEvent(e))
    .map((e) => ({ id: e.id, label: e.title, date: e.ts.slice(0, 10) })) // admin ts = authored date + UTC time
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, take)
    .map(({ id, label, date }) => ({ id, label, meta: date }));
}
