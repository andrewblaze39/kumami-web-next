/**
 * Liquidation Heatmap rule engine.
 *
 * Sources: doc lines 638–668.
 *
 * Scans clusters within ±15% of current price.
 * Finds the largest cluster (by volume) above and below current price.
 * Assigns distance-based labels, then a combined zone verdict.
 *
 * Distance bands (shared for both above and below):
 *   0% to <3%  → "Immediate" (red)
 *   3% to <8%  → "Squeeze/Flush Zone" (amber)
 *   8% to ≤15% → "Cluster" (grey)
 *
 * Boundary decisions:
 *   - Distance = 0%: treated as above (same price → distance 0, goes to above bucket if
 *     clusterPrice >= currentPrice, else below).
 *   - 3% distance: belongs to the 3–8% band (Short Squeeze Zone / Long Flush Zone).
 *   - 8% distance: belongs to the 8–15% band (Upper/Lower Liq Cluster).
 *   - Exactly 15%: included in the scan (within ±15% inclusive).
 *   - 15%+ε: excluded (beyond 15%).
 *
 * Contested Zone: requires largest clusters BOTH above AND below to be within 5% of price.
 *
 * Significance threshold: all clusters passed to the function are treated as significant.
 * Callers should pre-filter by a minimum volume threshold before calling.
 */

import type { Verdict } from '../contracts';

export type HeatmapCluster = {
  price: number;
  volumeUsd: number;
};

export type HeatmapInputs = {
  currentPrice: number;
  clusters: HeatmapCluster[];
};

export type HeatmapResult = {
  verdict: Verdict;
  upperTag: Verdict | null;
  lowerTag: Verdict | null;
  tags: Verdict[];
};

function distancePct(currentPrice: number, clusterPrice: number): number {
  return Math.abs((clusterPrice - currentPrice) / currentPrice) * 100;
}

function upperDistanceTag(clusterPrice: number, distPct: number): Verdict {
  const priceLabel = `$${clusterPrice}`;
  if (distPct < 3) return { label: `Immediate Short Target at ${priceLabel}`, color: 'red' };
  if (distPct < 8) return { label: `Short Squeeze Zone at ${priceLabel}`, color: 'amber' };
  return              { label: `Upper Liq Cluster at ${priceLabel}`, color: 'grey' };
}

function lowerDistanceTag(clusterPrice: number, distPct: number): Verdict {
  const priceLabel = `$${clusterPrice}`;
  if (distPct < 3) return { label: `Immediate Long Target at ${priceLabel}`, color: 'red' };
  if (distPct < 8) return { label: `Long Flush Zone at ${priceLabel}`, color: 'amber' };
  return              { label: `Lower Liq Cluster at ${priceLabel}`, color: 'grey' };
}

export function computeHeatmap(inputs: HeatmapInputs): HeatmapResult {
  const { currentPrice, clusters } = inputs;

  // Split into above (≥ currentPrice) and below (< currentPrice) within ±15%
  const aboveClusters = clusters
    .filter(c => c.price >= currentPrice && distancePct(currentPrice, c.price) <= 15)
    .sort((a, b) => b.volumeUsd - a.volumeUsd);

  const belowClusters = clusters
    .filter(c => c.price < currentPrice && distancePct(currentPrice, c.price) <= 15)
    .sort((a, b) => b.volumeUsd - a.volumeUsd);

  const largestAbove = aboveClusters[0] ?? null;
  const largestBelow = belowClusters[0] ?? null;

  const upperDistPct = largestAbove ? distancePct(currentPrice, largestAbove.price) : null;
  const lowerDistPct = largestBelow ? distancePct(currentPrice, largestBelow.price) : null;

  const upperTag = largestAbove && upperDistPct !== null
    ? upperDistanceTag(largestAbove.price, upperDistPct)
    : null;

  const lowerTag = largestBelow && lowerDistPct !== null
    ? lowerDistanceTag(largestBelow.price, lowerDistPct)
    : null;

  // Combined zone verdict
  let verdict: Verdict;
  const hasAbove = largestAbove !== null;
  const hasBelow = largestBelow !== null;
  const aboveWithin5 = upperDistPct !== null && upperDistPct <= 5;
  const belowWithin5 = lowerDistPct !== null && lowerDistPct <= 5;

  if (hasAbove && hasBelow && aboveWithin5 && belowWithin5) {
    verdict = { label: 'Price in Contested Zone — Volatility Likely', color: 'amber' };
  } else if (hasAbove && !hasBelow) {
    verdict = { label: 'Upside Magnet — Short Squeeze Setup', color: 'grey-green' };
  } else if (hasBelow && !hasAbove) {
    verdict = { label: 'Downside Magnet — Long Flush Setup', color: 'grey-red' };
  } else if (hasAbove && hasBelow) {
    // Both sides but not both within 5% → pick dominant direction (larger cluster wins)
    // Doc doesn't specify this case; use Upside/Downside based on which side has larger volume
    const aboveVol = largestAbove?.volumeUsd ?? 0;
    const belowVol = largestBelow?.volumeUsd ?? 0;
    verdict = aboveVol >= belowVol
      ? { label: 'Upside Magnet — Short Squeeze Setup', color: 'grey-green' }
      : { label: 'Downside Magnet — Long Flush Setup', color: 'grey-red' };
  } else {
    verdict = { label: 'Clear Zone — Lower Forced Movement Risk', color: 'grey' };
  }

  return {
    verdict,
    upperTag,
    lowerTag,
    tags: [upperTag, lowerTag].filter((t): t is Verdict => t !== null),
  };
}
