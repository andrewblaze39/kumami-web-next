/**
 * Live Calendar payload — standalone /world/calendar tab.
 *
 * Source: Kumami Plus §7 "CALENDAR". Merges two live CoinGlass feeds:
 *   macro events ← /api/calendar/economic-data
 *   token unlocks ← /api/coin/unlock-list
 *
 * "Protocol" events (governance votes, mainnet launches) are described in the
 * doc as an editorial pipeline added manually — no such content pipeline
 * exists yet, so the 'protocol' type is wired in the contract/UI filter but
 * never populated. Disclosed here rather than faked.
 *
 * Impact classification mirrors the existing Intelligence builder's logic
 * (same source data, same thresholds) for consistency across the two tabs.
 */

import type { CalendarEvent, CalendarPayload } from '../contracts';
import { economicCalendar, coinUnlocks } from './cg-endpoints';
import { tsToIso } from './helpers';

const PLUS_ASSETS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'HYPE']);

export async function makeCalendarPayloadLive(): Promise<CalendarPayload> {
  const [calendar, unlocks] = await Promise.all([
    economicCalendar().catch(() => []),
    coinUnlocks().catch(() => []),
  ]);

  const events: CalendarEvent[] = [];

  // --- Macro events (importance >= 1, wider window than the Intelligence preview) --
  for (const c of calendar) {
    const impact: CalendarEvent['impact'] =
      c.importance_level >= 3 ? 'HIGH' : c.importance_level >= 2 ? 'MED' : 'LOW';
    const fc = c.forecast_value ? ` · forecast ${c.forecast_value}` : '';
    const prev = c.previous_value ? ` · prev ${c.previous_value}` : '';
    events.push({
      id: `macro-${c.publish_timestamp}-${events.length}`,
      type: 'macro',
      title: `${c.calendar_name} (${c.country_code})`,
      ts: tsToIso(c.publish_timestamp),
      impact,
      assets: ['BTC'], // macro prints are market-wide; BTC as the Plus-roster proxy
      description: `${c.data_effect || 'Scheduled economic release.'}${fc}${prev}`.trim(),
    });
  }

  // --- Token unlocks (recognizable projects, meaningful locked supply) -----------
  const fmtUsd = (v: number) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`);
  for (const u of unlocks) {
    if (!(u.total_locked > 0 && u.price > 0 && u.market_cap > 50_000_000)) continue;
    const lockedUsd = u.total_locked * u.price;
    const pctSupply = u.total_supply > 0 ? u.total_locked / u.total_supply : 0;
    const impact: CalendarEvent['impact'] = pctSupply > 0.05 ? 'HIGH' : pctSupply > 0.01 ? 'MED' : 'LOW';
    events.push({
      id: `unlock-${u.symbol}-${events.length}`,
      type: 'unlock',
      title: `${u.name} (${u.symbol}) token unlock`,
      ts: new Date().toISOString(),
      impact,
      assets: [u.symbol],
      description: `${fmtUsd(lockedUsd)} of ${u.symbol} locked (${(pctSupply * 100).toFixed(0)}% of supply) · market cap ${fmtUsd(u.market_cap)}.`,
    });
  }

  events.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

  return { events, updatedAt: new Date().toISOString() };
}

/** Whether an event's assets overlap the Plus 5-asset roster (BTC/ETH/SOL/BNB/HYPE). */
export function isPlusRosterEvent(event: CalendarEvent): boolean {
  return event.assets.some((a) => PLUS_ASSETS.has(a));
}
