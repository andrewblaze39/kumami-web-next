/**
 * Liquidations 24H rule engine.
 *
 * Sources: doc lines 466–509; color polarity corrected per the "Kumami Plus"
 * spec's cross-cutting fix — color reflects the immediate event (which side
 * got forcibly closed), not a cleanup interpretation:
 *   long-heavy liquidations = longs destroyed = bearish → red-leaning
 *   short-heavy liquidations = shorts destroyed = bullish → green-leaning
 *
 * Logic:
 *   long_ratio = long_liq / total_liq (provided as input, 0–1)
 *   Size significance:
 *     < $50M  → LOW
 *     $50M–$200M → MEDIUM  (inclusive lower, inclusive upper: ≥50M and ≤200M)
 *     > $200M → HIGH       (strict: >200M)
 *
 * Verdict matrix (doc lines 477–501, colors per Kumami Plus §2.1b):
 *   long_ratio > 70% + HIGH   → Mass Long Flush  (red)
 *   long_ratio > 70% + MEDIUM → Long-Heavy       (grey-red)
 *   long_ratio < 30% + HIGH   → Short Squeeze    (green)
 *   long_ratio < 30% + MEDIUM → Short-Heavy      (grey-green)
 *   long_ratio 40–60% (any)   → Balanced Liquidations (grey)
 *   LOW significance (any ratio) → Insignificant  (grey)
 *
 * Uncovered gaps (doc is silent on these ranges):
 *   long_ratio 30–40% + MEDIUM/HIGH → "Short Bias Liquidations" (grey-green — short-heavy tilt)
 *   long_ratio 60–70% + MEDIUM/HIGH → "Long Bias Liquidations"  (grey-red — long-heavy tilt)
 *   These cover the bands between the doc's explicit matrix cells, following the
 *   same long-heavy=red / short-heavy=green polarity as the explicit cells.
 *
 * Boundary decisions:
 *   - long_ratio exactly 70% is NOT > 70% → falls to Long Bias / Balanced range.
 *   - long_ratio exactly 30% is NOT < 30% → falls to Short Bias / Balanced range.
 *   - Total exactly $50M → MEDIUM (≥50M).
 *   - Total exactly $200M → MEDIUM (≤200M); $200M+1 → HIGH.
 *   - Total exactly $500M → NOT > $500M → no Cascade prefix.
 *
 * Cascade: total > $500M → prepend "Cascade — " to label.
 */

import type { Verdict } from '../contracts';

export type LiquidationInputs = {
  /** Total liquidation volume in USD over 24h */
  totalUsd: number;
  /** Fraction of liquidations that are longs (0–1), i.e. longLiq / totalLiq */
  longRatio: number;
};

export type LiquidationSignificance = 'LOW' | 'MEDIUM' | 'HIGH';

export type LiquidationResult = {
  verdict: Verdict;
  significance: LiquidationSignificance;
  tags: Verdict[];
};

function getSignificance(totalUsd: number): LiquidationSignificance {
  if (totalUsd > 200_000_000) return 'HIGH';
  if (totalUsd >= 50_000_000) return 'MEDIUM';
  return 'LOW';
}

function baseVerdict(
  longRatio: number,
  significance: LiquidationSignificance,
): Verdict {
  if (significance === 'LOW') {
    return { label: 'Insignificant Liquidations', color: 'grey' };
  }

  if (longRatio > 0.7) {
    if (significance === 'HIGH') return { label: 'Mass Long Flush', color: 'red' };
    return { label: 'Long-Heavy', color: 'grey-red' };
  }

  if (longRatio < 0.3) {
    if (significance === 'HIGH') return { label: 'Short Squeeze', color: 'green' };
    return { label: 'Short-Heavy', color: 'grey-green' };
  }

  if (longRatio >= 0.4 && longRatio <= 0.6) {
    return { label: 'Balanced Liquidations', color: 'grey' };
  }

  // Gap zones: 30–40% and 60–70% (doc is silent, covered by design decision above)
  if (longRatio > 0.6) {
    return { label: 'Long Bias Liquidations', color: 'grey-red' };
  }
  // 30–40%
  return { label: 'Short Bias Liquidations', color: 'grey-green' };
}

export function computeLiquidations(inputs: LiquidationInputs): LiquidationResult {
  const { totalUsd, longRatio } = inputs;
  const significance = getSignificance(totalUsd);
  const base = baseVerdict(longRatio, significance);

  const cascade = totalUsd > 500_000_000;
  const verdict: Verdict = cascade
    ? { label: `Cascade — ${base.label}`, color: base.color }
    : base;

  return { verdict, significance, tags: [] };
}
