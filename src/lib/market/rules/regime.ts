/**
 * Global Regime rule engine.
 *
 * Sources:
 *   - Primary detailed logic: doc lines 356–398 (Console Indicator Logic).
 *   - Kumami Plus §1.1 "Global Regime — Rule Engine": 4 inputs (Fear & Greed,
 *     ETF Flow, Funding Rate, OI vs Price). Long/Short bias was dropped from the
 *     composite per the cross-cutting fix "Long/Short removed from Console
 *     engine — kept only in standalone tile" (it still drives the separate
 *     On-Chain Bias tile and Watchlist tags, just not this score).
 *
 * Edge decisions:
 *   - Doc labels from lines 382–387 are used (Strongly Bullish / Cautiously Bullish /
 *     Neutral / Cautiously Bearish / Strongly Bearish), not the abbreviated labels
 *     in the Global Regime header (lines 93–98) which differ.
 *   - Fear & Greed is contrarian and weighted at the extremes (Plus §1.1):
 *     0–24 → +1.5, 25–45 → +1, 46–55 → 0, 56–74 → −1, 75–100 → −1.5.
 *   - ETF flow (7D cumulative): beyond ±$100M counts, inside the band is 0 (scoreEtfFlow).
 *   - Funding (Plus §1.1): > +0.1% → −1, below −0.05% → +1, otherwise 0. The spec
 *     leaves +0.05%…+0.1% unscored; it is 0 here. Exactly 0.1% / −0.05% are 0 (strict).
 *   - OI vs price (scoreOiVsPrice): OI up + price up → +1, OI up + price down → −1
 *     (overleveraged), every other pair → 0.
 *   - Normalized score = raw score / count of active (non-zero) signals, per the
 *     cross-cutting fix "Score band normalization — divide by active signal count".
 *     This keeps the verdict meaningful even when some signals return neutral (0)
 *     rather than diluting the band thresholds with dead weight.
 *   - Confidence = share of the ACTIVE (non-zero) signals that agree with the winning
 *     direction (Plus §1.1). If no signal is active, confidence = 0.
 *   - maxConfidence caps it per asset: HYPE has fewer reliable signals, so 0.7 (§1.3).
 */

import type { Verdict } from '../contracts';

export type RegimeInputs = {
  /** Fear & Greed index value, 0–100 */
  fearGreed: number;
  /** Pre-scored ETF flow (see scoreEtfFlow): +1 above +$100M, -1 below −$100M, else 0 */
  etfFlowScore: -1 | 0 | 1;
  /** OI-weighted funding rate (decimal, e.g. 0.01 = 0.01%) */
  fundingRate: number;
  /**
   * Pre-scored OI vs price relationship (see scoreOiVsPrice):
   *  +1 = both rising (healthy trend)
   *  -1 = OI rising + price falling (overleveraged)
   *   0 = all other combinations
   */
  oiVsPriceScore: -1 | 0 | 1;
  /** Upper bound for confidence (HYPE: 0.7). Default 1. */
  maxConfidence?: number;
};

export type RegimeComponents = {
  /** ±1.5 at the extremes, ±1, or 0. */
  fearGreed: -1.5 | -1 | 0 | 1 | 1.5;
  etfFlow: -1 | 0 | 1;
  funding: -1 | 0 | 1;
  oiVsPrice: -1 | 0 | 1;
};

export type RegimeResult = {
  verdict: Verdict;
  confidence: number;
  /** Raw summed score (before normalization). */
  score: number;
  /** Normalized score (score / active signal count), what the verdict bands are keyed on. */
  normalizedScore: number;
  components: RegimeComponents;
};

function scoreFearGreed(value: number): RegimeComponents['fearGreed'] {
  if (value <= 24) return 1.5;  // Extreme Fear → strong contrarian buy
  if (value <= 45) return 1;    // Fear
  if (value <= 55) return 0;    // Neutral
  if (value <= 74) return -1;   // Greed
  return -1.5;                  // Extreme Greed → strong contrarian sell
}

function scoreFunding(rate: number): -1 | 0 | 1 {
  if (rate > 0.1) return -1;    // > +0.1% → overheated longs (contrarian bearish)
  if (rate < -0.05) return 1;   // below −0.05% → crowded short (contrarian bullish)
  return 0;                     // the neutral zone
}

/** ETF flow band (Plus §1.1): only a 7-day cumulative flow beyond ±$100M counts. */
export const ETF_BAND_USD = 100_000_000;
export function scoreEtfFlow(cumulative7dUsd: number): -1 | 0 | 1 {
  if (cumulative7dUsd > ETF_BAND_USD) return 1;
  if (cumulative7dUsd < -ETF_BAND_USD) return -1;
  return 0;
}

/** OI vs price matrix (Plus §1.1). */
export function scoreOiVsPrice(oi: 'up' | 'down' | 'flat', price: 'up' | 'down' | 'flat'): -1 | 0 | 1 {
  if (oi === 'up' && price === 'up') return 1;     // healthy trend
  if (oi === 'up' && price === 'down') return -1;  // overleveraged
  return 0;                                        // OI up + flat, short covering, unwind
}

const VERDICT_BANDS: { min: number; label: string; color: Verdict['color'] }[] = [
  { min: 0.6,   label: 'Strongly Bullish',   color: 'green' },
  { min: 0.25,  label: 'Cautiously Bullish', color: 'grey-green' },
  { min: -0.25, label: 'Neutral',            color: 'grey' },
  { min: -0.6,  label: 'Cautiously Bearish', color: 'grey-red' },
  { min: -Infinity, label: 'Strongly Bearish', color: 'red' },
];

function verdictFromNormalizedScore(normalizedScore: number): Verdict {
  for (const row of VERDICT_BANDS) {
    if (normalizedScore >= row.min) return { label: row.label, color: row.color };
  }
  return { label: 'Strongly Bearish', color: 'red' };
}

function computeConfidence(components: RegimeComponents, score: number): number {
  const active = (Object.values(components) as number[]).filter(v => v !== 0);
  if (active.length === 0) return 0;
  const positives = active.filter(v => v > 0).length;
  const negatives = active.length - positives;
  // score = 0: opposing signals cancel out, so no side wins; report the larger side
  const agreeing = score > 0 ? positives : score < 0 ? negatives : Math.max(positives, negatives);
  return agreeing / active.length;
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
    funding: scoreFunding(inputs.fundingRate),
    oiVsPrice: inputs.oiVsPriceScore,
  };

  const values = Object.values(components) as number[];
  const score = values.reduce((a, b) => a + b, 0);
  const activeSignals = values.filter(v => v !== 0).length;
  const normalizedScore = activeSignals > 0 ? score / activeSignals : 0;
  const verdict = verdictFromNormalizedScore(normalizedScore);
  const confidence = Math.min(computeConfidence(components, score), inputs.maxConfidence ?? 1);

  return { verdict, confidence, score, normalizedScore, components };
}
