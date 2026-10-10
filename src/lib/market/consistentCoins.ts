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
import { HISTORY_DAYS, rankConsistentFlow, STABLECOINS } from './rules/consistentFlow';
import { computeSectionC } from './rules/watchlistSectionC';

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
