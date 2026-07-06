import { describe, it, expect } from 'vitest';
import { computeRegime, type RegimeInputs } from '../regime';

// Doc (lines 356-398): 5 inputs, each scored -1/0/+1, sum → verdict
// Verdicts: +3/+4="Strongly Bullish", +1/+2="Cautiously Bullish", 0="Neutral",
//           -1/-2="Cautiously Bearish", -3/-4="Strongly Bearish"
// NOTE: The task prompt's Global Regime section (lines 93-98) shows different labels
// ("Bullish"/"Neutral · Leaning Bullish" etc.) vs the Console indicator logic (lines 382-387)
// ("Strongly Bullish"/"Cautiously Bullish" etc.). THE DOC WINS — using lines 382-387 labels.

// Fear & Greed scoring (doc lines 359-364):
// 0-24  → +1 (contrarian), 25-45 → +1, 46-55 → 0, 56-75 → -1, 76-100 → -1

// OI vs Price (doc lines 366-370):
// Both rising → +1, OI rising+price flat → -1, Both falling → 0, OI falling+price up → 0

// Stablecoin 30D change (doc lines 372-376):
// > +3% → +1, ±3% → 0, < -3% → -1

// Funding Rate (doc lines 378-381):
// > +0.1% → -1, 0 to +0.1% → 0, Negative → +1

// NOTE: The doc's Console section only lists 4 inputs (Fear/Greed, OI/Price, Stablecoin, Funding).
// The Global Regime header (line 85-99) lists 5 inputs including ETF Flow direction and L/S bias.
// The Console Indicator Logic block (lines 356-387) is more detailed and explicitly scores 4 inputs.
// Edge decision: we implement the 4-input scoring from the detailed logic block (lines 356-387),
// and keep ETF Flow + L/S as additional scored inputs using the Global Regime header's intent
// (line 88-91) with +1/0/-1 scoring by direction. Total max score is thus ±5 but verdicts
// use the 4-input scale from lines 382-387 (+3/+4 = Strongly Bullish, etc.).
// Actually on re-read: Global Regime block (lines 85-99) is THE regime spec for the Console panel
// and uses 5 inputs with sum ≥+3 = Bullish. The detailed Console logic block (lines 346-401) is
// a DIFFERENT section describing the same thing but with only 4 inputs listed.
// Decision: use the 5-input spec from lines 356-400 but with the labels from lines 382-387.
// ETF flow: positive direction → +1, neutral/zero → 0, negative → -1
// L/S on-chain bias: >55% long → +1, 45-55% → 0, <45% → -1 (reasonable interpretation)

describe('computeRegime — Fear & Greed scoring', () => {
  const base: RegimeInputs = {
    fearGreed: 50,
    etfFlowScore: 0,
    longShortPctLong: 50,
    fundingRate: 0,
    oiVsPriceScore: 0,
  };

  it('scores +1 for Extreme Fear (0)', () => {
    const r = computeRegime({ ...base, fearGreed: 0 });
    expect(r.components.fearGreed).toBe(1);
  });

  it('scores +1 at boundary 24', () => {
    expect(computeRegime({ ...base, fearGreed: 24 }).components.fearGreed).toBe(1);
  });

  it('scores +1 at boundary 25', () => {
    expect(computeRegime({ ...base, fearGreed: 25 }).components.fearGreed).toBe(1);
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

  it('scores -1 at 75 (Greed band top)', () => {
    expect(computeRegime({ ...base, fearGreed: 75 }).components.fearGreed).toBe(-1);
  });

  it('scores -1 at 76 (Extreme Greed start)', () => {
    expect(computeRegime({ ...base, fearGreed: 76 }).components.fearGreed).toBe(-1);
  });

  it('scores -1 at 100', () => {
    expect(computeRegime({ ...base, fearGreed: 100 }).components.fearGreed).toBe(-1);
  });
});

describe('computeRegime — Funding Rate scoring', () => {
  const base: RegimeInputs = {
    fearGreed: 50,
    etfFlowScore: 0,
    longShortPctLong: 50,
    fundingRate: 0,
    oiVsPriceScore: 0,
  };

  it('scores -1 when funding > +0.1%', () => {
    expect(computeRegime({ ...base, fundingRate: 0.11 }).components.funding).toBe(-1);
  });

  it('scores -1 at exactly +0.1% boundary (just above)', () => {
    expect(computeRegime({ ...base, fundingRate: 0.101 }).components.funding).toBe(-1);
  });

  it('scores 0 at exactly +0.1%', () => {
    // Boundary decision: > 0.1% → -1, so 0.1% itself is 0
    expect(computeRegime({ ...base, fundingRate: 0.1 }).components.funding).toBe(0);
  });

  it('scores 0 for 0 to +0.1% range', () => {
    expect(computeRegime({ ...base, fundingRate: 0.05 }).components.funding).toBe(0);
  });

  it('scores 0 at exactly 0', () => {
    expect(computeRegime({ ...base, fundingRate: 0 }).components.funding).toBe(0);
  });

  it('scores +1 for negative funding', () => {
    expect(computeRegime({ ...base, fundingRate: -0.01 }).components.funding).toBe(1);
  });

  it('scores +1 for deeply negative funding', () => {
    expect(computeRegime({ ...base, fundingRate: -0.2 }).components.funding).toBe(1);
  });
});

describe('computeRegime — OI vs Price scoring', () => {
  const base: RegimeInputs = {
    fearGreed: 50,
    etfFlowScore: 0,
    longShortPctLong: 50,
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
    longShortPctLong: 50,
    fundingRate: 0,
    oiVsPriceScore: 0,
  };

  it('scores +1 for positive ETF flow', () => {
    expect(computeRegime({ ...base, etfFlowScore: 1 }).components.etfFlow).toBe(1);
  });

  it('scores -1 for negative ETF flow', () => {
    expect(computeRegime({ ...base, etfFlowScore: -1 }).components.etfFlow).toBe(-1);
  });

  it('scores 0 for neutral ETF flow', () => {
    expect(computeRegime({ ...base, etfFlowScore: 0 }).components.etfFlow).toBe(0);
  });
});

describe('computeRegime — Long/Short bias scoring', () => {
  const base: RegimeInputs = {
    fearGreed: 50,
    etfFlowScore: 0,
    longShortPctLong: 50,
    fundingRate: 0,
    oiVsPriceScore: 0,
  };

  it('scores +1 when >55% long', () => {
    expect(computeRegime({ ...base, longShortPctLong: 60 }).components.longShort).toBe(1);
  });

  it('scores +1 at exactly 55% boundary (just above)', () => {
    expect(computeRegime({ ...base, longShortPctLong: 55.1 }).components.longShort).toBe(1);
  });

  it('scores 0 in 45-55% range', () => {
    expect(computeRegime({ ...base, longShortPctLong: 50 }).components.longShort).toBe(0);
  });

  it('scores 0 at exactly 55%', () => {
    // Boundary: >55% → +1, so 55% itself is 0
    expect(computeRegime({ ...base, longShortPctLong: 55 }).components.longShort).toBe(0);
  });

  it('scores 0 at exactly 45%', () => {
    // Boundary: <45% → -1, so 45% itself is 0
    expect(computeRegime({ ...base, longShortPctLong: 45 }).components.longShort).toBe(0);
  });

  it('scores -1 when <45% long', () => {
    expect(computeRegime({ ...base, longShortPctLong: 40 }).components.longShort).toBe(-1);
  });
});

describe('computeRegime — verdict from sum', () => {
  const bullishAll: RegimeInputs = {
    fearGreed: 20,      // +1
    etfFlowScore: 1,    // +1
    longShortPctLong: 65, // +1
    fundingRate: -0.05, // +1
    oiVsPriceScore: 1,  // +1
  };

  const bearishAll: RegimeInputs = {
    fearGreed: 80,      // -1
    etfFlowScore: -1,   // -1
    longShortPctLong: 35, // -1
    fundingRate: 0.15,  // -1
    oiVsPriceScore: -1, // -1
  };

  it('returns Strongly Bullish for score +5 (all bull)', () => {
    const r = computeRegime(bullishAll);
    expect(r.score).toBe(5);
    expect(r.verdict.label).toBe('Strongly Bullish');
    expect(r.verdict.color).toBe('green');
  });

  it('returns Strongly Bullish for score +3', () => {
    const r = computeRegime({ ...bullishAll, etfFlowScore: 0, oiVsPriceScore: 0 });
    expect(r.score).toBe(3);
    expect(r.verdict.label).toBe('Strongly Bullish');
  });

  it('returns Cautiously Bullish for score +2', () => {
    const r = computeRegime({ ...bullishAll, etfFlowScore: 0, oiVsPriceScore: 0, fundingRate: 0 });
    expect(r.score).toBe(2);
    expect(r.verdict.label).toBe('Cautiously Bullish');
  });

  it('returns Cautiously Bullish for score +1', () => {
    const r = computeRegime({ fearGreed: 20, etfFlowScore: 0, longShortPctLong: 50, fundingRate: 0, oiVsPriceScore: 0 });
    expect(r.score).toBe(1);
    expect(r.verdict.label).toBe('Cautiously Bullish');
  });

  it('returns Neutral for score 0', () => {
    const r = computeRegime({ fearGreed: 50, etfFlowScore: 0, longShortPctLong: 50, fundingRate: 0, oiVsPriceScore: 0 });
    expect(r.score).toBe(0);
    expect(r.verdict.label).toBe('Neutral');
    expect(r.verdict.color).toBe('grey');
  });

  it('returns Cautiously Bearish for score -1', () => {
    const r = computeRegime({ fearGreed: 70, etfFlowScore: 0, longShortPctLong: 50, fundingRate: 0, oiVsPriceScore: 0 });
    expect(r.score).toBe(-1);
    expect(r.verdict.label).toBe('Cautiously Bearish');
  });

  it('returns Cautiously Bearish for score -2', () => {
    const r = computeRegime({ fearGreed: 80, etfFlowScore: -1, longShortPctLong: 50, fundingRate: 0, oiVsPriceScore: 0 });
    expect(r.score).toBe(-2);
    expect(r.verdict.label).toBe('Cautiously Bearish');
  });

  it('returns Strongly Bearish for score -3', () => {
    const r = computeRegime({ ...bearishAll, etfFlowScore: 0, longShortPctLong: 50 });
    expect(r.score).toBe(-3);
    expect(r.verdict.label).toBe('Strongly Bearish');
    expect(r.verdict.color).toBe('red');
  });

  it('returns Strongly Bearish for score -5 (all bear)', () => {
    const r = computeRegime(bearishAll);
    expect(r.score).toBe(-5);
    expect(r.verdict.label).toBe('Strongly Bearish');
  });
});

describe('computeRegime — confidence', () => {
  it('is 1.0 when all 5 signals agree (all +1)', () => {
    const r = computeRegime({ fearGreed: 20, etfFlowScore: 1, longShortPctLong: 65, fundingRate: -0.05, oiVsPriceScore: 1 });
    expect(r.confidence).toBe(1);
  });

  it('is 0.8 when 4 of 5 agree', () => {
    // 4 bullish, 1 neutral (0 counts as not agreeing with majority direction)
    const r = computeRegime({ fearGreed: 20, etfFlowScore: 1, longShortPctLong: 65, fundingRate: -0.05, oiVsPriceScore: 0 });
    expect(r.confidence).toBeCloseTo(0.8);
  });

  it('is 0 for fully mixed (score 0, no clear direction)', () => {
    const r = computeRegime({ fearGreed: 50, etfFlowScore: 0, longShortPctLong: 50, fundingRate: 0, oiVsPriceScore: 0 });
    // All neutral → no agreeing signals
    expect(r.confidence).toBe(0);
  });
});
