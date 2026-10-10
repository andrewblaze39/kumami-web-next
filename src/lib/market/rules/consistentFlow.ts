/**
 * "Consistent in Flow Radar" — Watchlist Pro's extra coins and Spot Pulse
 * Pro's second row (Andrew's spec v1.6, Pro §19 / §5 ← Rachelle Kumami
 * Website (6) Pro brief: "All tokens detected in Flow Radar that stay
 * consistent for 7D go into the watchlist — 5 fixed + 5 consistent spikes";
 * "Spot Pulse takes the tokens that enter the watchlist").
 *
 * Daily tallies are recorded by lib/market/flowHistory.ts whenever the Flow
 * Radar buffer refreshes. A coin is "present" on a day when it had at least
 * one HIGH or MED event that day. Ranking: days present (desc), then total
 * USD (desc). Pure functions — no I/O.
 */
import type { FlowEvent } from '../contracts';
import { BEARISH_DIRECTIONS, BULLISH_DIRECTIONS } from './flowVerdict';

export const HISTORY_DAYS = 7;
export const ANCHOR_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

/** Stablecoins move in huge whale transfers constantly but aren't coins to
 *  "watch" (or to read spot-vs-futures on) — never pick them as extra coins. */
export const STABLECOINS = ['USDT', 'USDC', 'DAI', 'FDUSD', 'TUSD', 'USDE', 'PYUSD', 'USDD', 'BUSD', 'USD1', 'RLUSD', 'USDS',
  // Wrapped / staked versions of the anchors are the same asset — not "extra" coins.
  'WBTC', 'CBBTC', 'TBTC', 'WETH', 'STETH', 'WSTETH', 'WEETH', 'RETH', 'CBETH', 'WSOL', 'WBNB'];
const isStable = (asset: string) => STABLECOINS.includes(asset.toUpperCase());

/** One coin on one day. `max*` fields keep the largest value seen in any buffer snapshot that day. */
export type FlowDayTally = {
  maxEvents: number;
  maxUsd: number;
  high: number;
  bullish: number;
  bearish: number;
};

export type FlowDailyDoc = { date: string; assets: Record<string, FlowDayTally> };

export type ConsistentCoin = {
  asset: string;
  daysPresent: number;
  totalUsd: number;
  reasons: string[];
};

/** UTC calendar day, YYYY-MM-DD. */
export function utcDay(ts: number | string): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Tally HIGH/MED events per coin for one UTC day (events outside that day are ignored). */
export function tallyDay(events: FlowEvent[], day: string): Record<string, FlowDayTally> {
  const out: Record<string, FlowDayTally> = {};
  for (const e of events) {
    if (e.severity !== 'HIGH' && e.severity !== 'MED') continue;
    if (utcDay(e.ts) !== day) continue;
    const t = (out[e.asset] ??= { maxEvents: 0, maxUsd: 0, high: 0, bullish: 0, bearish: 0 });
    t.maxEvents += 1;
    t.maxUsd += e.amountUsd;
    if (e.severity === 'HIGH') t.high += 1;
    if (BULLISH_DIRECTIONS.has(e.direction)) t.bullish += 1;
    else if (BEARISH_DIRECTIONS.has(e.direction)) t.bearish += 1;
  }
  return out;
}

/** Merge a fresh snapshot tally into the stored day: field-wise max (snapshots overlap, so never sum). */
export function mergeTallies(
  stored: Record<string, FlowDayTally> | undefined,
  fresh: Record<string, FlowDayTally>,
): Record<string, FlowDayTally> {
  const out: Record<string, FlowDayTally> = { ...(stored ?? {}) };
  for (const [asset, f] of Object.entries(fresh)) {
    const s = out[asset];
    out[asset] = s
      ? {
          maxEvents: Math.max(s.maxEvents, f.maxEvents),
          maxUsd: Math.max(s.maxUsd, f.maxUsd),
          high: Math.max(s.high, f.high),
          bullish: Math.max(s.bullish, f.bullish),
          bearish: Math.max(s.bearish, f.bearish),
        }
      : f;
  }
  return out;
}

const fmtUsd = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${Math.round(v / 1e3)}K`;

/**
 * Rank coins by how many of the given days they were present in Flow Radar.
 * `days` = the last HISTORY_DAYS daily docs (any order, gaps allowed).
 */
export function rankConsistentFlow(days: FlowDailyDoc[], exclude: Set<string>, limit = 5): ConsistentCoin[] {
  const acc = new Map<string, { days: number; usd: number; high: number; bull: number; bear: number }>();
  for (const d of days) {
    for (const [asset, t] of Object.entries(d.assets ?? {})) {
      if (exclude.has(asset) || isStable(asset) || t.maxEvents < 1) continue;
      const a = acc.get(asset) ?? { days: 0, usd: 0, high: 0, bull: 0, bear: 0 };
      a.days += 1;
      a.usd += t.maxUsd;
      a.high += t.high;
      a.bull += t.bullish;
      a.bear += t.bearish;
      acc.set(asset, a);
    }
  }
  return [...acc.entries()]
    .sort((x, y) => y[1].days - x[1].days || y[1].usd - x[1].usd)
    .slice(0, limit)
    .map(([asset, a]) => {
      const lean = a.bull > a.bear ? 'mostly bullish flow' : a.bear > a.bull ? 'mostly bearish flow' : 'mixed flow';
      return {
        asset,
        daysPresent: a.days,
        totalUsd: a.usd,
        reasons: [
          `In Flow Radar ${a.days} of the last ${HISTORY_DAYS} days`,
          `${fmtUsd(a.usd)} flagged · ${lean}`,
          ...(a.high > 0 ? [`${a.high} HIGH-severity event${a.high === 1 ? '' : 's'}`] : []),
        ],
      };
    });
}

/** Keep only the most recent HISTORY_DAYS calendar days ending at `today` (inclusive). */
export function lastNDays(docs: FlowDailyDoc[], today: string, n = HISTORY_DAYS): FlowDailyDoc[] {
  const start = new Date(`${today}T00:00:00Z`).getTime() - (n - 1) * 86_400_000;
  return docs.filter((d) => {
    const t = new Date(`${d.date}T00:00:00Z`).getTime();
    return t >= start && t <= new Date(`${today}T00:00:00Z`).getTime();
  });
}
