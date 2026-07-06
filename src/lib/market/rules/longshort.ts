/**
 * Long/Short Ratio rule engine.
 *
 * Sources: doc lines 576–621.
 *
 * Global % long bands (all boundaries inclusive unless stated):
 *   > 75%       → "Extremely Crowded Long"   (red)     [75% itself → Crowded Long]
 *   65–75%      → "Crowded Long"             (amber)   [both ends inclusive]
 *   55–65%      → "Long Bias"                (grey-green)
 *   45–55%      → "Balanced"                 (grey)
 *   35–45%      → "Short Bias"               (grey-red)
 *   25–35%      → "Crowded Short"            (amber)
 *   < 25%       → "Extremely Crowded Short"  (green)   [25% itself → Crowded Short]
 *
 * Boundary decisions:
 *   Each range is defined such that bands share inclusive endpoints with the lower band.
 *   I.e. the boundary value belongs to the less extreme (inner) band:
 *     75% → Crowded Long (not Extremely Crowded Long)
 *     65% → Crowded Long (lower bound of that range)
 *     25% → Crowded Short (not Extremely Crowded Short)
 *
 * Smart money divergence (doc lines 607–620):
 *   gap = topTraderPctLong − globalPctLong (signed)
 *   gap < −15% (top traders >15% more short than crowd) → "· Smart Money Fading the Crowd"
 *   gap > +15% (top traders >15% more long than crowd)  → "· Smart Money Leading Long"
 *   |gap| ≤ 15% → no divergence tag (doc says "within 10%" = aligned; 10–15% = gap zone).
 *   Decision: use >15% strict for both tags (doc line 242 says "gap >15%").
 */

import type { Verdict } from '../contracts';

export type LongShortInputs = {
  /** Global long % (0–100) across all accounts */
  globalPctLong: number;
  /** Top trader long % (0–100) */
  topTraderPctLong: number;
};

export type LongShortResult = {
  verdict: Verdict;
  tags: Verdict[];
};

function baseVerdict(pct: number): Verdict {
  if (pct > 75)  return { label: 'Extremely Crowded Long',  color: 'red' };
  if (pct >= 65) return { label: 'Crowded Long',            color: 'amber' };
  if (pct >= 55) return { label: 'Long Bias',               color: 'grey-green' };
  if (pct >= 45) return { label: 'Balanced',                color: 'grey' };
  if (pct >= 35) return { label: 'Short Bias',              color: 'grey-red' };
  if (pct >= 25) return { label: 'Crowded Short',           color: 'amber' };
  return              { label: 'Extremely Crowded Short', color: 'green' };
}

export function computeLongShort(inputs: LongShortInputs): LongShortResult {
  const { globalPctLong, topTraderPctLong } = inputs;
  const verdict = baseVerdict(globalPctLong);

  const gap = topTraderPctLong - globalPctLong;
  const tags: Verdict[] = [];

  if (gap < -15) {
    // Top traders significantly more short than crowd
    tags.push({ label: '· Smart Money Fading the Crowd', color: 'amber' });
  } else if (gap > 15) {
    // Top traders significantly more long than crowd
    tags.push({ label: '· Smart Money Leading Long', color: 'green' });
  }

  return { verdict, tags };
}
