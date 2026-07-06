/**
 * CVD (Cumulative Volume Delta) rule engine.
 *
 * Sources: doc lines 675–723.
 *
 * Primary 6-cell matrix (price direction × aggregated CVD direction):
 *   up   × up    → "Buyer-Led Rally"            (green)
 *   up   × flat  → "Liquidity-Driven Rally"     (amber)
 *   up   × down  → "Distribution Rally"         (red)
 *   down × down  → "Seller-Led Decline"         (red)
 *   down × flat  → "Forced Liquidation Decline" (amber)
 *   down × up    → "Accumulation Decline"       (green)
 *
 * Spot/Futures CVD divergence tags (doc lines 714–722):
 *   Futures rising + Spot flat or falling → "· Speculative Move — Spot Not Confirming"
 *   Spot rising + Futures flat            → "· Organic Move — Spot Leading"
 *   All other combinations: no tag
 *
 * Note: the cvdDirection input is the aggregate (combined futures+spot) trend used for
 * the primary matrix. spotCVDDirection and futuresCVDDirection are for the divergence tag.
 */

import type { Verdict } from '../contracts';

export type Direction = 'up' | 'flat' | 'down';

export type CVDInputs = {
  priceDirection: Direction;
  /** Aggregate CVD trend (used for primary matrix) */
  cvdDirection: Direction;
  /** Spot-only CVD trend (used for divergence tag) */
  spotCVDDirection: Direction;
  /** Futures-only CVD trend (used for divergence tag) */
  futuresCVDDirection: Direction;
};

export type CVDResult = {
  verdict: Verdict;
  tags: Verdict[];
};

type Cell = [Direction, Direction];

const MATRIX: [Cell, string, Verdict['color']][] = [
  [['up',   'up'],   'Buyer-Led Rally',            'green'],
  [['up',   'flat'], 'Liquidity-Driven Rally',     'amber'],
  [['up',   'down'], 'Distribution Rally',         'red'],
  [['down', 'down'], 'Seller-Led Decline',         'red'],
  [['down', 'flat'], 'Forced Liquidation Decline', 'amber'],
  [['down', 'up'],   'Accumulation Decline',       'green'],
];

function primaryVerdict(priceDir: Direction, cvdDir: Direction): Verdict {
  for (const [[pd, cd], label, color] of MATRIX) {
    if (pd === priceDir && cd === cvdDir) return { label, color };
  }
  // Flat price is not in the 6-cell matrix (doc covers only up/down price).
  // Fallback for price flat: neutral
  return { label: 'Neutral CVD Signal', color: 'grey' };
}

function divergenceTag(
  spotDir: Direction,
  futuresDir: Direction,
): Verdict | null {
  // Futures rising + Spot flat or falling → Speculative
  if (futuresDir === 'up' && (spotDir === 'flat' || spotDir === 'down')) {
    return { label: '· Speculative Move — Spot Not Confirming', color: 'amber' };
  }
  // Spot rising + Futures flat → Organic
  if (spotDir === 'up' && futuresDir === 'flat') {
    return { label: '· Organic Move — Spot Leading', color: 'green' };
  }
  return null;
}

export function computeCVD(inputs: CVDInputs): CVDResult {
  const { priceDirection, cvdDirection, spotCVDDirection, futuresCVDDirection } = inputs;
  const verdict = primaryVerdict(priceDirection, cvdDirection);
  const tag = divergenceTag(spotCVDDirection, futuresCVDDirection);
  return { verdict, tags: tag ? [tag] : [] };
}
