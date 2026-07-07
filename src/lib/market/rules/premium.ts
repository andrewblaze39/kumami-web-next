/**
 * Coinbase Premium rule engine.
 *
 * Sources: doc lines 737–798 (detailed), 281–297 (summary).
 *
 * Premium = (Coinbase BTC price − global avg BTC price) / global avg × 100
 *
 * Instantaneous bands (value as decimal, e.g. 0.003 = 0.3%):
 *   > +0.3%          → "Strong US Premium"   (green)
 *   +0.1% to +0.3%   → "Mild US Premium"     (grey-green)
 *   −0.1% to +0.1%   → "Neutral"             (grey)
 *   −0.3% to −0.1%   → "Offshore Leading"    (amber)
 *   < −0.3%          → "US Discount"         (red)
 *
 * Boundary decisions:
 *   - The doc writes "−0.1% to +0.1%" for Neutral.  The ±0.1 endpoints are
 *     included in Neutral (not in the adjacent bands).  So Mild US Premium
 *     requires strictly > +0.1%; Offshore Leading requires strictly < −0.1%.
 *   - +0.3% exactly → Mild US Premium (< +0.3 upper bound for that band;
 *     Strong US Premium requires strictly > +0.3%).
 *   - −0.3% exactly → Offshore Leading (> −0.3 lower bound for that band;
 *     US Discount requires strictly < −0.3%).
 *   - Doc line 758 says "−0.1% to −0.3%" for Offshore Leading and line 757
 *     says "−0.1% to +0.1%" for Neutral — the −0.1 boundary belongs to
 *     Neutral since Neutral's range is inclusive.
 *
 * Note on doc color labels:
 *   Doc says "grey-amber" for Offshore Leading and "amber-red" for US Discount.
 *   These are not valid Verdict colors (see contracts.ts).  Mapping:
 *     "grey-amber"  → "amber"  (Offshore Leading — caution)
 *     "amber-red"   → "red"    (US Discount — bearish)
 *
 * Trend modifiers (7D context — all three are mutually exclusive in practice):
 *   positive7dStreak  → "· Sustained Institutional Demand"   (green)
 *   flippedPositive   → "· US Demand Returning"              (green)
 *   flippedNegative   → "· US Demand Fading"                 (amber)
 *
 * Cross-signal with netflow:
 *   Strong US Premium + exchange outflow  → verdict override:
 *     "Institutional Accumulation Signal"  (green)
 *   US Discount + exchange inflow         → verdict override:
 *     "Retail Distribution Signal"         (red)
 *
 * Decision on cross-signal override vs tag:
 *   The doc says these become named signals ("Institutional Accumulation
 *   Signal" / "Retail Distribution Signal") — treated as verdict label
 *   override keeping the base color, not separate tags, to match the
 *   doc phrasing "Cross-signal: Strong Premium + Exchange Outflow →
 *   'Institutional Accumulation Signal'".
 */

import type { Verdict } from '../contracts';

export type PremiumInputs = {
  /**
   * Current premium as a decimal (e.g. 0.003 = +0.3%, −0.002 = −0.2%).
   * Premium = (Coinbase price − global price) / global price.
   */
  premium: number;

  /**
   * 7D trend context — pass the condition that applies:
   *   'positive_streak'   — premium has been consistently positive all 7D
   *   'flipped_positive'  — premium flipped from negative → positive recently
   *   'flipped_negative'  — premium flipped from positive → negative recently
   *   'none'              — no notable 7D trend
   */
  trend7d: 'positive_streak' | 'flipped_positive' | 'flipped_negative' | 'none';

  /**
   * Exchange netflow direction for the cross-signal check.
   *   'outflow'  — net exchange outflow (accumulation lean)
   *   'inflow'   — net exchange inflow  (distribution lean)
   *   'neutral'  — near-zero / unclear
   */
  exchangeFlow: 'outflow' | 'inflow' | 'neutral';
};

export type PremiumResult = {
  verdict: Verdict;
  tags: Verdict[];
};

const P_STRONG  = 0.003;   // 0.3%
const P_MILD    = 0.001;   // 0.1%
const N_MILD    = -0.001;  // −0.1%
const N_STRONG  = -0.003;  // −0.3%

function baseVerdict(p: number): Verdict {
  if (p > P_STRONG)  return { label: 'Strong US Premium', color: 'green' };
  if (p > P_MILD)    return { label: 'Mild US Premium',   color: 'grey-green' };
  if (p >= N_MILD)   return { label: 'Neutral',           color: 'grey' };
  if (p >= N_STRONG) return { label: 'Offshore Leading',  color: 'amber' };
  return                    { label: 'US Discount',       color: 'red' };
}

export function computePremium(inputs: PremiumInputs): PremiumResult {
  const { premium, trend7d, exchangeFlow } = inputs;

  let verdict = baseVerdict(premium);
  const tags: Verdict[] = [];

  // --- Cross-signal overrides (applied before trend tags) ---
  if (verdict.label === 'Strong US Premium' && exchangeFlow === 'outflow') {
    verdict = { label: 'Institutional Accumulation Signal', color: 'green' };
  } else if (verdict.label === 'US Discount' && exchangeFlow === 'inflow') {
    verdict = { label: 'Retail Distribution Signal', color: 'red' };
  }

  // --- 7D trend modifiers ---
  if (trend7d === 'positive_streak') {
    tags.push({ label: '· Sustained Institutional Demand', color: 'green' });
  } else if (trend7d === 'flipped_positive') {
    tags.push({ label: '· US Demand Returning', color: 'green' });
  } else if (trend7d === 'flipped_negative') {
    tags.push({ label: '· US Demand Fading', color: 'amber' });
  }

  return { verdict, tags };
}
