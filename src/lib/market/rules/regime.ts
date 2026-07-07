/**
 * Global Regime rule engine.
 *
 * Sources:
 *   - Primary detailed logic: doc lines 356–398 (Console Indicator Logic).
 *   - 5-input list: doc lines 85–99 (Global Regime header).
 *
 * Edge decisions:
 *   - The Console detailed section (lines 356–387) lists 4 explicit scoring inputs
 *     (Fear/Greed, OI/Price, Stablecoin, Funding) but the Global Regime header
 *     (lines 85–99) specifies 5 inputs including ETF Flow and L/S bias.
 *     We implement all 5. ETF flow is passed as a pre-scored -1/0/+1 (caller's job
 *     to derive direction from raw flow data). L/S bias: >55% long → +1, <45% → -1.
 *   - Doc labels from lines 382–387 are used (Strongly Bullish / Cautiously Bullish /
 *     Neutral / Cautiously Bearish / Strongly Bearish), not the abbreviated labels
 *     in the Global Regime header (lines 93–98) which differ.
 *   - Funding boundary: doc says "> +0.1% → -1, 0 to +0.1% → 0". Exactly 0.1% is 0
 *     (strict greater-than).
 *   - L/S boundary: >55% long → +1 (strict), <45% long → -1 (strict), else 0.
 *   - Confidence = fraction of non-zero signals that agree with the winning direction.
 *     If score = 0 and no non-zero signals exist, confidence = 0.
 */

import type { Verdict } from '../contracts';

export type RegimeInputs = {
  /** Fear & Greed index value, 0–100 */
  fearGreed: number;
  /** Pre-scored ETF flow direction: +1 = net positive, 0 = neutral, -1 = net negative */
  etfFlowScore: -1 | 0 | 1;
  /** Global long % (0–100) from long/short ratio */
  longShortPctLong: number;
  /** OI-weighted funding rate (decimal, e.g. 0.01 = 0.01%) */
  fundingRate: number;
  /**
   * Pre-scored OI vs price relationship:
   *  +1 = both rising (trend strengthening)
   *  -1 = OI rising + price flat (leverage building without price confirmation)
   *   0 = all other combinations
   */
  oiVsPriceScore: -1 | 0 | 1;
};

export type RegimeComponents = {
  fearGreed: -1 | 0 | 1;
  etfFlow: -1 | 0 | 1;
  longShort: -1 | 0 | 1;
  funding: -1 | 0 | 1;
  oiVsPrice: -1 | 0 | 1;
};

export type RegimeResult = {
  verdict: Verdict;
  confidence: number;
  score: number;
  components: RegimeComponents;
};

function scoreFearGreed(value: number): -1 | 0 | 1 {
  if (value <= 45) return 1;   // 0–45: Extreme Fear / Fear → contrarian buy
  if (value <= 55) return 0;   // 46–55: Neutral
  return -1;                   // 56–100: Greed / Extreme Greed → contrarian sell
}

function scoreFunding(rate: number): -1 | 0 | 1 {
  if (rate > 0.1) return -1;   // > +0.1% → overleveraged long (bearish for regime)
  if (rate < 0) return 1;      // negative → shorts paying → contrarian bullish
  return 0;                    // 0 to +0.1% inclusive → neutral
}

function scoreLongShort(pctLong: number): -1 | 0 | 1 {
  if (pctLong > 55) return 1;  // bullish bias
  if (pctLong < 45) return -1; // bearish bias
  return 0;
}

const VERDICT_MAP: { minScore: number; label: string; color: Verdict['color'] }[] = [
  { minScore: 3,  label: 'Strongly Bullish',  color: 'green' },
  { minScore: 1,  label: 'Cautiously Bullish', color: 'grey-green' },
  { minScore: 0,  label: 'Neutral',            color: 'grey' },
  { minScore: -2, label: 'Cautiously Bearish', color: 'grey-red' },
  { minScore: -5, label: 'Strongly Bearish',   color: 'red' },
];

function verdictFromScore(score: number): Verdict {
  for (const row of VERDICT_MAP) {
    if (score >= row.minScore) return { label: row.label, color: row.color };
  }
  return { label: 'Strongly Bearish', color: 'red' };
}

function computeConfidence(components: RegimeComponents, score: number): number {
  const values = Object.values(components) as number[];
  const nonZero = values.filter(v => v !== 0);
  if (nonZero.length === 0) return 0;
  const direction = score > 0 ? 1 : score < 0 ? -1 : 0;
  if (direction === 0) {
    // score = 0 but might have opposing signals cancelling out
    const positives = nonZero.filter(v => v > 0).length;
    const negatives = nonZero.filter(v => v < 0).length;
    const maxAgree = Math.max(positives, negatives);
    return maxAgree / values.length;
  }
  const agreeing = nonZero.filter(v => v === direction).length;
  return agreeing / values.length;
}

// ---------------------------------------------------------------------------
// Fear & Greed display classification (for ConsolePayload server fields)
// ---------------------------------------------------------------------------

export type FearGreedClassification = {
  label: string;
  /** CSS color token name used by the design system bar fill. */
  color: 'green' | 'lime' | 'grey' | 'amber' | 'red';
};

/**
 * Classify a Fear & Greed index value (0–100) into a display label and color.
 * Thresholds match the original MarketConditions.tsx client-side logic.
 * >=75 → Extreme Greed / red
 * >=60 → Greed / amber
 * >=40 → Neutral / grey
 * >=25 → Fear / lime
 *  <25 → Extreme Fear / green  (contrarian: green = good signal)
 */
export function classifyFearGreed(value: number): FearGreedClassification {
  if (value >= 75) return { label: 'Extreme Greed', color: 'red' };
  if (value >= 60) return { label: 'Greed',         color: 'amber' };
  if (value >= 40) return { label: 'Neutral',        color: 'grey' };
  if (value >= 25) return { label: 'Fear',           color: 'lime' };
  return             { label: 'Extreme Fear',      color: 'green' };
}

export function computeRegime(inputs: RegimeInputs): RegimeResult {
  const components: RegimeComponents = {
    fearGreed: scoreFearGreed(inputs.fearGreed),
    etfFlow: inputs.etfFlowScore,
    longShort: scoreLongShort(inputs.longShortPctLong),
    funding: scoreFunding(inputs.fundingRate),
    oiVsPrice: inputs.oiVsPriceScore,
  };

  const score = (Object.values(components) as number[]).reduce((a, b) => a + b, 0);
  const verdict = verdictFromScore(score);
  const confidence = computeConfidence(components, score);

  return { verdict, confidence, score, components };
}
