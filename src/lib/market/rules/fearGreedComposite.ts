/**
 * Fear & Greed composite index — 5 weighted sub-metrics.
 *
 * Source: Kumami Plus §6 "FEAR & GREED". Each sub-metric maps its raw signal
 * to a 0-100 score; the composite is a weighted average of the 5 scores.
 *
 * Weights (doc §6.2 Composite Score):
 *   Price Momentum      x 0.30
 *   L/S Sentiment       x 0.20
 *   Volatility          x 0.15
 *   Market Composition  x 0.20
 *   News Tone           x 0.15
 *
 * Composite label bands (same as the raw index): 0-24 Extreme Fear, 25-45 Fear,
 * 46-55 Neutral, 56-74 Greed, 75-100 Extreme Greed.
 */

import type { Verdict } from '../contracts';

export type FearGreedTag = { label: string; color: Verdict['color'] };

// ---------------------------------------------------------------------------
// Sub-metric 1 — Price Momentum
// ---------------------------------------------------------------------------

/** momentumPct = (price_current - price_30d_avg) / price_30d_avg * 100 */
export function scorePriceMomentum(momentumPct: number): number {
  if (momentumPct > 20) return 95;
  if (momentumPct > 10) return 80;
  if (momentumPct >= -10) return 55;
  if (momentumPct >= -20) return 25;
  return 5;
}

// ---------------------------------------------------------------------------
// Sub-metric 2 — Long/Short Sentiment (contrarian: crowded long = greed)
// ---------------------------------------------------------------------------

export function scoreLongShortSentiment(pctLong: number): number {
  if (pctLong > 75) return 95;
  if (pctLong > 65) return 80;
  if (pctLong > 55) return 62;
  if (pctLong >= 45) return 47;
  if (pctLong >= 35) return 32;
  if (pctLong >= 25) return 17;
  return 5;
}

// ---------------------------------------------------------------------------
// Sub-metric 3 — Volatility (7D vs 30D realized; low vol = complacency = greed)
// ---------------------------------------------------------------------------

export type VolatilityLabel = 'High' | 'Medium' | 'Low';

export function scoreVolatility(volRatio: number): { score: number; label: VolatilityLabel } {
  if (volRatio > 1.5) return { score: 7, label: 'High' };
  if (volRatio > 1.2) return { score: 22, label: 'High' };
  if (volRatio > 0.9) return { score: 50, label: 'Medium' };
  if (volRatio > 0.7) return { score: 70, label: 'Low' };
  return { score: 90, label: 'Low' };
}

// ---------------------------------------------------------------------------
// Sub-metric 4 — Market Composition (stablecoin supply; inverted: shrinking
// supply = capital deploying to risk = greed)
// ---------------------------------------------------------------------------

export function scoreMarketComposition(change7dUsd: number): number {
  if (change7dUsd > 5_000_000_000) return 7;
  if (change7dUsd > 2_000_000_000) return 25;
  if (change7dUsd >= -2_000_000_000) return 50;
  if (change7dUsd >= -5_000_000_000) return 75;
  return 92;
}

// ---------------------------------------------------------------------------
// Sub-metric 5 — News Tone (% of headlines the AI labels bullish)
// ---------------------------------------------------------------------------

export function scoreNewsTone(bullishPct: number): number {
  if (bullishPct > 75) return 92;
  if (bullishPct > 60) return 75;
  if (bullishPct >= 40) return 50;
  if (bullishPct >= 25) return 27;
  return 8;
}

// ---------------------------------------------------------------------------
// Composite
// ---------------------------------------------------------------------------

export type SubMetricScores = {
  priceMomentum: number;
  longShortSentiment: number;
  volatility: number;
  marketComposition: number;
  newsTone: number;
};

const WEIGHTS: Record<keyof SubMetricScores, number> = {
  priceMomentum: 0.30,
  longShortSentiment: 0.20,
  volatility: 0.15,
  marketComposition: 0.20,
  newsTone: 0.15,
};

// The ONE Fear & Greed classification (Rachelle v1.17 Plus §4), used by the Console tile and
// regime, the Fear & Greed page and the Daily Digest: 0–24 Extreme Fear · 25–45 Fear ·
// 46–55 Neutral · 56–74 Greed · 75–100 Extreme Greed. Fear = red, Greed = green.
export function classifyComposite(score: number): { label: string; color: Verdict['color'] } {
  if (score >= 75) return { label: 'Extreme Greed', color: 'green' };
  if (score >= 56) return { label: 'Greed', color: 'grey-green' };
  if (score >= 46) return { label: 'Neutral', color: 'grey' };
  if (score >= 25) return { label: 'Fear', color: 'grey-red' };
  return { label: 'Extreme Fear', color: 'red' };
}

/**
 * Weighted composite over the sub-metrics that have real data (null = missing):
 * the weights re-normalise over what's present, so a missing factor is left out
 * rather than filled with a neutral 50 (Andrew's hard rule, 22 Oct 2026). With
 * nothing present the score is 50 — callers flag that payload as unavailable.
 */
export function computeCompositeFearGreed(scores: { [K in keyof SubMetricScores]: number | null }): {
  score: number;
  label: string;
  color: Verdict['color'];
} {
  let sum = 0;
  let weight = 0;
  for (const k of Object.keys(WEIGHTS) as (keyof SubMetricScores)[]) {
    const v = scores[k];
    if (v === null) continue;
    sum += v * WEIGHTS[k];
    weight += WEIGHTS[k];
  }
  const score = weight > 0 ? Math.round(sum / weight) : 50;
  const { label, color } = classifyComposite(score);
  return { score, label, color };
}
