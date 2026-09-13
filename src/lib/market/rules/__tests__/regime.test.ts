import { describe, it, expect } from 'vitest';
import { computeRegime, type RegimeInputs } from '../regime';

// Kumami Plus §1.1 "Global Regime — Rule Engine": 4 inputs, each scored -1/0/+1,
// normalized (sum / active-signal-count) → verdict band. Long/Short bias is NOT
// part of this composite (cross-cutting fix: "Long/Short removed from Console
// engine — kept only in standalone tile").
//
// Fear & Greed: 0-45 → +1 (contrarian), 46-55 → 0, 56-100 → -1
// Funding Rate: > +0.1% → -1, 0 to +0.1% → 0, negative → +1
// OI vs Price: both rising → +1, OI rising + price flat → -1, else 0
// ETF Flow: pre-scored by caller, passed through as-is
//
// Verdict bands (normalized score = sum / count of non-zero signals):
//   >= 0.6            → Strongly Bullish
//   0.25 to 0.6        → Cautiously Bullish
//   -0.25 to 0.25      → Neutral
//   -0.6 to -0.25      → Cautiously Bearish
//   < -0.6             → Strongly Bearish

describe('computeRegime — Fear & Greed scoring', () => {
  const base: RegimeInputs = {
    fearGreed: 50,
    etfFlowScore: 0,
    fundingRate: 0,
    oiVsPriceScore: 0,
  };

  it('scores +1 for Extreme Fear (0)', () => {
    expect(computeRegime({ ...base, fearGreed: 0 }).components.fearGreed).toBe(1);
  });

  it('scores +1 at 45 (top of Fear band)', () => {
    expect(computeRegime({ ...base, fearGreed: 45 }).components.fearGreed).toBe(1);
  });

  it('scores 0 at 46 (Neutral band start)', () => {
    expect(computeRegime({ ...base, fearGreed: 46 }).components.fearGreed).toBe(0);
  });

  it('scores 0 at 55 (Neutral band top)', () => {
    expect(computeRegime({ ...base, fearGreed: 55 }).components.fearGreed).toBe(0);
  });

  it('scores -1 at 56 (Greed band start)', () => {
    expect(computeRegime({ ...base, fearGreed: 56 }).components.fearGreed).toBe(-1);
  });

  it('scores -1 at 100', () => {
    expect(computeRegime({ ...base, fearGreed: 100 }).components.fearGreed).toBe(-1);
  });
});

describe('computeRegime — Funding Rate scoring', () => {
  const base: RegimeInputs = {
    fearGreed: 50,
    etfFlowScore: 0,
    fundingRate: 0,
    oiVsPriceScore: 0,
  };

  it('scores -1 when funding > +0.1%', () => {
    expect(computeRegime({ ...base, fundingRate: 0.11 }).components.funding).toBe(-1);
  });

  it('scores 0 at exactly +0.1%', () => {
    expect(computeRegime({ ...base, fundingRate: 0.1 }).components.funding).toBe(0);
  });

  it('scores 0 at exactly 0', () => {
    expect(computeRegime({ ...base, fundingRate: 0 }).components.funding).toBe(0);
  });

  it('scores +1 for negative funding', () => {
    expect(computeRegime({ ...base, fundingRate: -0.01 }).components.funding).toBe(1);
  });
});

describe('computeRegime — OI vs Price scoring', () => {
  const base: RegimeInputs = {
    fearGreed: 50,
    etfFlowScore: 0,
    fundingRate: 0,
    oiVsPriceScore: 0,
  };

  it('scores +1 when oiVsPriceScore = 1 (both rising)', () => {
    expect(computeRegime({ ...base, oiVsPriceScore: 1 }).components.oiVsPrice).toBe(1);
  });

  it('scores -1 when oiVsPriceScore = -1 (OI rising, price flat)', () => {
    expect(computeRegime({ ...base, oiVsPriceScore: -1 }).components.oiVsPrice).toBe(-1);
  });

  it('scores 0 when oiVsPriceScore = 0', () => {
    expect(computeRegime({ ...base, oiVsPriceScore: 0 }).components.oiVsPrice).toBe(0);
  });
});

describe('computeRegime — ETF Flow scoring', () => {
  const base: RegimeInputs = {
    fearGreed: 50,
    etfFlowScore: 0,
    fundingRate: 0,
    oiVsPriceScore: 0,
  };

  it('scores +1 for positive ETF flow', () => {
    expect(computeRegime({ ...base, etfFlowScore: 1 }).components.etfFlow).toBe(1);
  });

  it('scores -1 for negative ETF flow', () => {
    expect(computeRegime({ ...base, etfFlowScore: -1 }).components.etfFlow).toBe(-1);
  });
});

describe('computeRegime — normalized score & verdict bands', () => {
  const allBullish: RegimeInputs = {
    fearGreed: 20,      // +1
    etfFlowScore: 1,    // +1
    fundingRate: -0.05, // +1
    oiVsPriceScore: 1,  // +1
  };

  const allBearish: RegimeInputs = {
    fearGreed: 80,      // -1
    etfFlowScore: -1,   // -1
    fundingRate: 0.15,  // -1
    oiVsPriceScore: -1, // -1
  };

  it('all 4 bullish → normalizedScore 1.0, Strongly Bullish', () => {
    const r = computeRegime(allBullish);
    expect(r.score).toBe(4);
    expect(r.normalizedScore).toBe(1);
    expect(r.verdict.label).toBe('Strongly Bullish');
    expect(r.verdict.color).toBe('green');
  });

  it('1 of 4 active, that one bullish → normalizedScore 1.0, Strongly Bullish (neutral signals do not dilute)', () => {
    const r = computeRegime({ fearGreed: 20, etfFlowScore: 0, fundingRate: 0, oiVsPriceScore: 0 });
    expect(r.score).toBe(1);
    expect(r.normalizedScore).toBe(1);
    expect(r.verdict.label).toBe('Strongly Bullish');
  });

  it('2 bullish + 1 bearish + 1 neutral → normalizedScore ~0.33, Cautiously Bullish', () => {
    const r = computeRegime({ fearGreed: 20, etfFlowScore: 1, fundingRate: 0.15, oiVsPriceScore: 0 });
    expect(r.score).toBe(1);
    expect(r.normalizedScore).toBeCloseTo(1 / 3);
    expect(r.verdict.label).toBe('Cautiously Bullish');
  });

  it('all neutral → normalizedScore 0, Neutral', () => {
    const r = computeRegime({ fearGreed: 50, etfFlowScore: 0, fundingRate: 0, oiVsPriceScore: 0 });
    expect(r.score).toBe(0);
    expect(r.normalizedScore).toBe(0);
    expect(r.verdict.label).toBe('Neutral');
    expect(r.verdict.color).toBe('grey');
  });

  it('1 bullish + 1 bearish + 2 neutral → normalizedScore 0, Neutral', () => {
    const r = computeRegime({ fearGreed: 20, etfFlowScore: -1, fundingRate: 0, oiVsPriceScore: 0 });
    expect(r.normalizedScore).toBe(0);
    expect(r.verdict.label).toBe('Neutral');
  });

  it('2 bearish + 1 bullish + 1 neutral → normalizedScore ~-0.33, Cautiously Bearish', () => {
    const r = computeRegime({ fearGreed: 80, etfFlowScore: -1, fundingRate: -0.05, oiVsPriceScore: 0 });
    expect(r.normalizedScore).toBeCloseTo(-1 / 3);
    expect(r.verdict.label).toBe('Cautiously Bearish');
  });

  it('all 4 bearish → normalizedScore -1.0, Strongly Bearish', () => {
    const r = computeRegime(allBearish);
    expect(r.score).toBe(-4);
    expect(r.normalizedScore).toBe(-1);
    expect(r.verdict.label).toBe('Strongly Bearish');
    expect(r.verdict.color).toBe('red');
  });
});

describe('computeRegime — confidence', () => {
  it('is 1.0 when all active signals agree (all +1)', () => {
    const r = computeRegime({ fearGreed: 20, etfFlowScore: 1, fundingRate: -0.05, oiVsPriceScore: 1 });
    expect(r.confidence).toBe(1);
  });

  it('is 0.75 when 3 of 4 agree (1 neutral)', () => {
    const r = computeRegime({ fearGreed: 20, etfFlowScore: 1, fundingRate: -0.05, oiVsPriceScore: 0 });
    expect(r.confidence).toBeCloseTo(0.75);
  });

  it('is 0 for fully neutral (no active signals)', () => {
    const r = computeRegime({ fearGreed: 50, etfFlowScore: 0, fundingRate: 0, oiVsPriceScore: 0 });
    expect(r.confidence).toBe(0);
  });
});
