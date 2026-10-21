/**
 * Watchlist Pro Section C "Also Worth Watching" — 3-day net accumulation
 * (Rachelle v1.15 Pro §19; replaces the 7-day "days present" rule, which
 * ignored direction: a coin sold every day could rank first and get a ◆).
 *
 * Candidates: coins in Flow Radar in the last 3 days, excluding the core assets,
 * the user's pins, stablecoins and wrapped tokens (Dry Powder flow is market-wide
 * and is never a coin's accumulation).
 *
 * A coin qualifies only if ALL hold:
 *   1. net buying beats selling on at least 2 of the last 3 days
 *   2. 3-day net buying > +$5M
 *   3. the last 24h doesn't undo more than 25% of that net
 *   4. spot buyers are net positive over 3 days (netflow-list net_flow_usd_3d > 0)
 *   5. it passes the Section B liquidity check (≥ $10M spot volume + a futures market)
 * Ranked by days of accumulation, then net buying ÷ 24h spot volume.
 * No padding: fewer than 5 qualify → show fewer.
 *
 * Data: the daily Flow Radar tally (flow_daily). Each day's bullish/bearish $ is
 * recorded from v1.15 on; older days only have event counts, so their $ split is
 * estimated from the counts and the section is labelled "building 3-day history"
 * until 3 days with real $ exist.
 *
 * Once the background collector has written 72h of flow_hourly (the spec's source),
 * the three days become rolling 24h blocks ending now (hourlyToBlocks), recomputed
 * hourly — see consistentCoins.pickSectionC.
 */

import type { FlowDailyDoc, FlowDayTally } from './consistentFlow';
import { checkPin, type PinMarkets } from './watchlistPins';

export const SECTION_C_DAYS = 3;
export const SECTION_C_MIN_NET = 5_000_000;
export const SECTION_C_MAX_UNDO = 0.25;

export type SectionC3dEntry = {
  asset: string;
  daysAccumulating: number;
  net3d: number;
  spotNet3d: number;
  reasons: string[];
};

export type SectionC3dResult = {
  coins: SectionC3dEntry[];
  /** 'consistent' once 3 days with recorded $ exist, else 'building'. */
  mode: 'consistent' | 'building';
  /** Days (0–3) with recorded bullish/bearish $. */
  daysWithUsd: number;
  /** 'hourly' = rolling 24h blocks from flow_hourly; 'daily' = flow_daily calendar days. */
  source?: 'hourly' | 'daily';
};

/** One flow_hourly document (written by the background collector). */
export type FlowHourlyRow = { hour: string; asset: string; bullishUsd?: number; bearishUsd?: number };

const DAY_MS = 24 * 3_600_000;

/**
 * flow_hourly rows → three rolling 24h blocks (oldest first) shaped like flow_daily
 * days, so computeSectionC3d runs unchanged. `hour` is 'YYYY-MM-DDTHH' (UTC).
 */
export function hourlyToBlocks(rows: FlowHourlyRow[], now: number): FlowDailyDoc[] {
  const blocks: FlowDailyDoc[] = [2, 1, 0].map((i) => ({ date: new Date(now - i * DAY_MS).toISOString(), assets: {} }));
  for (const r of rows) {
    const age = now - Date.parse(`${r.hour}:00:00Z`);
    const i = Math.floor(age / DAY_MS);
    if (!(age >= 0 && i <= 2)) continue;
    const day = blocks[2 - i];
    const t = (day.assets[r.asset] ??= { maxEvents: 1, maxUsd: 0, high: 0, bullish: 0, bearish: 0, bullishUsd: 0, bearishUsd: 0 });
    t.bullishUsd! += Number(r.bullishUsd) || 0;
    t.bearishUsd! += Number(r.bearishUsd) || 0;
  }
  return blocks;
}

const fmt = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1e9 ? `$${(a / 1e9).toFixed(1)}B`
    : a >= 1e7 ? `$${Math.round(a / 1e6)}M`
    : a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M`
    : `$${Math.round(a / 1e3)}K`; // small spot flows read "$340K", never "$0M"
  return `${v >= 0 ? '+' : '−'}${s}`;
};

/** A day's net buying $ for one coin: recorded $ when present, else estimated from counts. */
export function dayNet(t: FlowDayTally): { net: number; estimated: boolean } {
  if (typeof t.bullishUsd === 'number' && typeof t.bearishUsd === 'number') {
    return { net: t.bullishUsd - t.bearishUsd, estimated: false };
  }
  const n = t.bullish + t.bearish;
  return { net: n > 0 ? (t.maxUsd * (t.bullish - t.bearish)) / n : 0, estimated: true };
}

export function computeSectionC3d(
  days: FlowDailyDoc[],
  opts: {
    exclude: Set<string>;
    markets: PinMarkets;
    /** symbol → spot net flow over 3 days (netflow-list net_flow_usd_3d). */
    spotNet3d: Map<string, number>;
    limit?: number;
  },
): SectionC3dResult {
  const last = [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-SECTION_C_DAYS);
  const daysWithUsd = last.filter((d) => Object.values(d.assets ?? {}).some((t) => typeof t.bullishUsd === 'number')).length;
  const mode = daysWithUsd >= SECTION_C_DAYS ? 'consistent' : 'building';

  const candidates = new Set<string>();
  for (const d of last) for (const [asset, t] of Object.entries(d.assets ?? {})) {
    if (t.maxEvents > 0 && !opts.exclude.has(asset)) candidates.add(asset);
  }

  const coins: SectionC3dEntry[] = [];
  for (const asset of candidates) {
    if (!checkPin(asset, opts.markets).ok) continue; // core / stable / wrapped / illiquid
    const nets = last.map((d) => (d.assets?.[asset] ? dayNet(d.assets[asset]).net : 0));
    const daysAccumulating = nets.filter((n) => n > 0).length;
    const net3d = nets.reduce((s, n) => s + n, 0);
    const lastDay = nets[nets.length - 1] ?? 0;
    const spot = opts.spotNet3d.get(asset) ?? 0;
    if (daysAccumulating < 2) continue;
    if (!(net3d > SECTION_C_MIN_NET)) continue;
    if (lastDay < -SECTION_C_MAX_UNDO * net3d) continue;
    if (!(spot > 0)) continue;
    coins.push({
      asset,
      daysAccumulating,
      net3d,
      spotNet3d: spot,
      reasons: [
        `Accumulating ${daysAccumulating} of ${last.length || SECTION_C_DAYS} days`,
        `net flow ${fmt(net3d)} · spot buyers ${fmt(spot)} (3d)`,
      ],
    });
  }

  const vol = (a: string) => opts.markets.spotVolume.get(a) || 1;
  coins.sort((x, y) => y.daysAccumulating - x.daysAccumulating || y.net3d / vol(y.asset) - x.net3d / vol(x.asset));
  return { coins: coins.slice(0, opts.limit ?? 5), mode, daysWithUsd };
}
