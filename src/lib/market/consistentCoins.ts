/**
 * "The 5 extra coins" shared by Watchlist Pro (Section C) and Spot Pulse Pro
 * (second row) — Andrew's spec v1.6 ← Rachelle Kumami Pro brief.
 *
 * Primary rule: most consistently present in Flow Radar over the last 7 days
 * (rules/consistentFlow.ts, history from flowHistory.ts). While fewer than 7
 * days of history exist, fall back to the 24h whale-flow scoring
 * (rules/watchlistSectionC.ts) so the section is never empty for no reason.
 */
import 'server-only';

import type { FlowEvent } from './contracts';
import { readFlowHistory } from './flowHistory';
import { HISTORY_DAYS, rankConsistentFlow, STABLECOINS, type FlowDailyDoc } from './rules/consistentFlow';
import { computeSectionC } from './rules/watchlistSectionC';
import { computeSectionC3d, hourlyToBlocks, SECTION_C_DAYS, type FlowHourlyRow, type SectionC3dResult } from './rules/watchlistSectionC3d';
import { hourOf } from './rules/collector';
import type { PinMarkets } from './rules/watchlistPins';
import { netflowList } from './live/cg-endpoints';

export type ExtraCoins = {
  coins: { asset: string; reasons: string[] }[];
  mode: 'consistent' | 'building';
  historyDays: number;
};

export async function pickExtraCoins(
  events: FlowEvent[],
  exclude: Set<string>,
  now = Date.now(),
  limit = 5,
): Promise<ExtraCoins> {
  const history = await readFlowHistory(now);
  const historyDays = history.length;
  if (historyDays >= HISTORY_DAYS) {
    const ranked = rankConsistentFlow(history, exclude, limit);
    if (ranked.length > 0) {
      return { coins: ranked.map((c) => ({ asset: c.asset, reasons: c.reasons })), mode: 'consistent', historyDays };
    }
  }
  // Building history: strongest 24h whale-flow candidates first, then fill the
  // remaining slots with the coins most often in Flow Radar in the history
  // collected so far (found by QA: the strict 24h criteria alone often return
  // nothing, leaving Spot Pulse Pro with no second row).
  const events24h = events.filter((e) => now - Date.parse(e.ts) <= 24 * 3_600_000);
  const coins = computeSectionC(events24h, new Set([...exclude, ...STABLECOINS]), now)
    .slice(0, limit)
    .map((s) => ({ asset: s.asset, reasons: s.reasons }));
  if (coins.length < limit) {
    const taken = new Set([...exclude, ...coins.map((c) => c.asset)]);
    for (const c of rankConsistentFlow(history, taken, limit - coins.length)) {
      coins.push({ asset: c.asset, reasons: c.reasons });
    }
  }
  return { coins, mode: 'building', historyDays };
}

/** Spot volume + futures markets from the cached netflow-lists (Section B pin check, Section C). */
export async function readPinMarkets(): Promise<(PinMarkets & { spotNet3d: Map<string, number> }) | null> {
  const [spot, futures] = await Promise.all([
    netflowList('spot').catch(() => null),
    netflowList('futures').catch(() => null),
  ]);
  if (!spot?.length || !futures?.length) return null;
  const spotVolume = new Map<string, number>();
  const spotNet3d = new Map<string, number>();
  for (const r of spot) {
    const s = String(r.symbol).toUpperCase();
    spotVolume.set(s, (Number(r.taker_buy_volume_usd_24h) || 0) + (Number(r.taker_sell_volume_usd_24h) || 0));
    spotNet3d.set(s, Number(r.net_flow_usd_3d) || 0);
  }
  return { spotVolume, spotNet3d, futures: new Set(futures.map((r) => String(r.symbol).toUpperCase())) };
}

/**
 * Section C "Also Worth Watching" (Rachelle v1.15 Pro §19): 3-day net accumulation,
 * confirmed by spot buyers, liquid coins only, no padding. Also Spot Pulse Pro's row 2.
 * Without the netflow-lists (outage) nothing qualifies — never a guessed list.
 */
export async function pickSectionC(exclude: Set<string>, now = Date.now(), limit = 5): Promise<SectionC3dResult> {
  const [hourly, markets] = await Promise.all([readHourlyBlocks(now), readPinMarkets()]);
  if (!markets) return { coins: [], mode: 'building', daysWithUsd: 0 };
  const opts = { exclude: new Set([...exclude, ...STABLECOINS]), markets, spotNet3d: markets.spotNet3d, limit };
  if (hourly) return { ...computeSectionC3d(hourly, opts), mode: 'consistent', daysWithUsd: SECTION_C_DAYS, source: 'hourly' };
  return { ...computeSectionC3d(await readFlowHistory(now), opts), source: 'daily' };
}

/**
 * The last 72h of flow_hourly as three 24h blocks — null until the collector has
 * covered the whole 72h (then the flow_daily migration path is used, per the spec).
 */
async function readHourlyBlocks(now: number): Promise<FlowDailyDoc[] | null> {
  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    const coll = adminDb().collection('flow_hourly');
    const from = hourOf(new Date(now - SECTION_C_DAYS * 24 * 3_600_000).toISOString());
    const oldest = await coll.orderBy('hour').limit(1).get();
    if (oldest.empty || String(oldest.docs[0].get('hour')) > from) return null;
    const snap = await coll.where('hour', '>=', from).get();
    return hourlyToBlocks(snap.docs.map((d) => d.data() as FlowHourlyRow), now);
  } catch (err) {
    console.error('[sectionC] flow_hourly unavailable — using flow_daily:', err);
    return null;
  }
}
