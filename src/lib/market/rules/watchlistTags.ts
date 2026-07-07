/**
 * Watchlist per-asset action tags engine.
 *
 * Sources: doc lines 1062–1092 (Watchlist section).
 *
 * Per-asset, 3 signals + 1 regime tag, output max 2 most-severe action tags.
 *
 * Signal 1 — Funding Rate (doc lines 1070–1073):
 *   fundingRate > +0.1%  → "Overheated" (red)
 *   fundingRate < 0%     → "Short Heavy" (amber)
 *   otherwise            → no tag
 *
 * Signal 2 — Liquidation proximity (doc lines 1075–1078):
 *   priceToLiqPct ≤ 3%   → "Near Liq Zone" (red)
 *   priceToLiqPct ≤ 5%   → "Watch Level"   (amber)
 *   otherwise            → no tag
 *
 *   The doc says "Price within 3%" and "Price within 5%".  Boundary:
 *   3% exactly → "Near Liq Zone"; 5% exactly → "Watch Level".
 *   (Inner threshold gets the boundary from the outer: 3% = Near Liq Zone.)
 *
 * Signal 3 — Long/Short ratio (doc lines 1080–1083):
 *   pctLong > 70%        → "Crowded Long"  (amber)
 *   pctLong < 30%        → "Crowded Short" (amber)
 *   40–60% range         → no tag
 *   Note: doc says "40–60% → no tag" but doesn't define 30–40% or 60–70%.
 *   Decision: the doc explicitly names only the >70% and <30% thresholds.
 *   Values between 30% and 40%, or 60% and 70%, are not listed — they fire
 *   no tag (conservative interpretation: only clear extremes trigger alerts).
 *
 * Regime tag — not an action tag but shown alongside (doc lines 1085–1089):
 *   oiUp + priceUp   → "Trending Up"   (grey-green)
 *   oiDown + priceDown → "Trending Down" (grey-red)
 *   oiUp + priceFlat → "Coiling"       (amber)
 *   lowOI + lowVolume → "Ranging"      (grey)
 *   (The regime is returned separately, not counted toward the 2-tag limit.)
 *
 * Severity ordering (for selecting max 2 most severe — doc line 1091:
 *   "show the 2 most severe"):
 *   Defined rank (highest first): red > amber
 *   Within same color: Signal 1 > Signal 2 > Signal 3 (priority order)
 *
 * Regime fallback: when OI and price directions don't match a listed case,
 * return "Ranging" (most conservative fallback).
 */

import type { Verdict } from '../contracts';

export type WatchlistTagsInputs = {
  /** OI-weighted funding rate (decimal, e.g. 0.001 = 0.1%). */
  fundingRate: number;
  /**
   * Distance from current price to nearest large liquidation cluster,
   * as a fraction (e.g. 0.03 = 3%).
   * Pass Infinity (or a large number) if no cluster is nearby.
   */
  priceToLiqPct: number;
  /** Global long % (0–100). */
  pctLong: number;
  /** OI direction for regime tag. */
  oiDirection: 'up' | 'flat' | 'down';
  /** Price direction for regime tag. */
  priceDirection: 'up' | 'flat' | 'down';
  /**
   * Whether OI and volume are both low (used for "Ranging" regime).
   * When true, takes priority over the OI/price-direction regime logic.
   */
  isLowOiLowVolume?: boolean;
};

export type WatchlistTagsResult = {
  /** Max 2 action tags, most severe first. */
  actionTags: Verdict[];
  /** Regime tag — shown separately, not in the 2-tag count. */
  regimeTag: Verdict;
};

/** Severity rank: higher = more severe. Used to select top 2. */
const SEVERITY_RANK: Record<Verdict['color'], number> = {
  'red':      4,
  'amber':    3,
  'grey-red': 2,
  'grey-green': 1,
  'grey':     0,
  'green':    0,
};

type CandidateTag = { tag: Verdict; priority: number }; // priority = signal order (lower = first)

function computeSignalTags(inputs: WatchlistTagsInputs): CandidateTag[] {
  const { fundingRate, priceToLiqPct, pctLong } = inputs;
  const candidates: CandidateTag[] = [];

  // Signal 1 — Funding Rate
  if (fundingRate > 0.001) {
    candidates.push({ tag: { label: 'Overheated', color: 'red' }, priority: 1 });
  } else if (fundingRate < 0) {
    candidates.push({ tag: { label: 'Short Heavy', color: 'amber' }, priority: 1 });
  }

  // Signal 2 — Liquidation proximity
  if (priceToLiqPct <= 0.03) {
    candidates.push({ tag: { label: 'Near Liq Zone', color: 'red' }, priority: 2 });
  } else if (priceToLiqPct <= 0.05) {
    candidates.push({ tag: { label: 'Watch Level', color: 'amber' }, priority: 2 });
  }

  // Signal 3 — Long/Short ratio
  if (pctLong > 70) {
    candidates.push({ tag: { label: 'Crowded Long', color: 'amber' }, priority: 3 });
  } else if (pctLong < 30) {
    candidates.push({ tag: { label: 'Crowded Short', color: 'amber' }, priority: 3 });
  }

  return candidates;
}

function computeRegimeTag(inputs: WatchlistTagsInputs): Verdict {
  const { oiDirection, priceDirection, isLowOiLowVolume } = inputs;

  if (isLowOiLowVolume) return { label: 'Ranging', color: 'grey' };

  if (oiDirection === 'up'   && priceDirection === 'up')   return { label: 'Trending Up',   color: 'grey-green' };
  if (oiDirection === 'down' && priceDirection === 'down') return { label: 'Trending Down',  color: 'grey-red' };
  if (oiDirection === 'up'   && priceDirection === 'flat') return { label: 'Coiling',        color: 'amber' };
  return { label: 'Ranging', color: 'grey' }; // unlisted combinations → Ranging
}

export function computeWatchlistTags(inputs: WatchlistTagsInputs): WatchlistTagsResult {
  const candidates = computeSignalTags(inputs);
  const regimeTag  = computeRegimeTag(inputs);

  // Select top 2 most severe: sort by severity rank desc, then by signal priority asc
  const sorted = candidates.slice().sort((a, b) => {
    const rankDiff = SEVERITY_RANK[b.tag.color] - SEVERITY_RANK[a.tag.color];
    if (rankDiff !== 0) return rankDiff;
    return a.priority - b.priority;
  });

  const actionTags = sorted.slice(0, 2).map(c => c.tag);

  return { actionTags, regimeTag };
}
