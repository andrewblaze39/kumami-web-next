import { describe, it, expect } from 'vitest';
import { computeRegime, confidenceVerdict, scoreEtfFlow, scoreOiVsPrice, type RegimeInputs } from '../regime';

// Kumami Plus §1.1 "Global Regime — Rule Engine" (Rachelle's Kumami Website (6)):
// 4 inputs, normalized (sum / active-signal-count) → verdict band. Long/Short bias is
// NOT part of this composite (cross-cutting fix: "Long/Short removed from Console
// engine — kept only in standalone tile").
//
// Fear & Greed (contrarian, weighted): 0-24 → +1.5, 25-45 → +1, 46-55 → 0, 56-74 → -1, 75-100 → -1.5
// ETF Flow (7D cumulative): > +$100M → +1, ±$100M → 0, < -$100M → -1
// Funding Rate: > +0.1% → -1, ±0.05% → 0, < -0.05% → +1
// OI vs Price: up+up → +1, up+flat → 0, up+down → -1, down+anything → 0
// Confidence: share of ACTIVE signals agreeing with the winning direction (no per-coin cap since v1.17)
//
// Verdict bands (normalized score = sum / count of non-zero signals):
//   >= 0.6            → Strongly Bullish
//   0.25 to 0.6        → Cautiously Bullish
//   -0.25 to 0.25      → Neutral
//   -0.6 to -0.25      → Cautiously Bearish
//   < -0.6             → Strongly Bearish

const base: RegimeInputs = {
  fearGreed: 50,
  etfFlowScore: 0,
  fundingRate: 0,
  oiVsPriceScore: 0,
};

describe('computeRegime — Fear & Greed scoring (weighted at the extremes)', () => {
  it.each([
    [0, 1.5], [24, 1.5],
    [25, 1], [45, 1],
    [46, 0], [55, 0],
    [56, -1], [74, -1],
    [75, -1.5], [100, -1.5],
  ])('F&G %i scores %d', (fg, score) => {
    expect(computeRegime({ ...base, fearGreed: fg }).components.fearGreed).toBe(score);
  });
});

describe('computeRegime — Funding Rate scoring', () => {
  it.each([
    [0.11, -1],
    [0.1, 0],     // exactly +0.1% is not "above"
    [0.07, 0],    // +0.05…+0.1% is unscored in the spec → 0
    [0.05, 0],
    [0, 0],
    [-0.01, 0],   // small negative funding is neutral now (was +1)
    [-0.05, 0],   // exactly −0.05% is not "below"
    [-0.06, 1],
  ])('funding %d%% scores %d', (rate, score) => {
    expect(computeRegime({ ...base, fundingRate: rate }).components.funding).toBe(score);
  });
});

describe('scoreEtfFlow — only a 7D flow beyond ±$100M counts', () => {
  it.each([
    [250_000_000, 1],
    [100_000_001, 1],
    [100_000_000, 0],
    [40_000_000, 0],
    [0, 0],
    [-99_000_000, 0],
    [-100_000_001, -1],
  ])('$%i scores %d', (usd, score) => {
    expect(scoreEtfFlow(usd)).toBe(score);
  });
});

describe('scoreOiVsPrice — the §1.1 matrix', () => {
  it.each([
    ['up', 'up', 1],      // healthy trend
    ['up', 'flat', 0],    // was -1 before (swapped)
    ['up', 'down', -1],   // overleveraged (was 0 before)
    ['down', 'up', 0],    // short covering
    ['down', 'down', 0],  // unwind
    ['flat', 'up', 0],
  ] as const)('OI %s + price %s scores %d', (oi, price, score) => {
    expect(scoreOiVsPrice(oi, price)).toBe(score);
  });
});

describe('computeRegime — pre-scored inputs pass through', () => {
  it('keeps ETF and OI scores as given', () => {
    const r = computeRegime({ ...base, etfFlowScore: -1, oiVsPriceScore: 1 });
    expect(r.components.etfFlow).toBe(-1);
    expect(r.components.oiVsPrice).toBe(1);
  });
});

describe('computeRegime — normalized score & verdict bands', () => {
  it('all 4 bullish (F&G Fear) → normalizedScore 1.0, Strongly Bullish', () => {
    const r = computeRegime({ fearGreed: 30, etfFlowScore: 1, fundingRate: -0.08, oiVsPriceScore: 1 });
    expect(r.score).toBe(4);
    expect(r.normalizedScore).toBe(1);
    expect(r.verdict.label).toBe('Strongly Bullish');
    expect(r.verdict.color).toBe('green');
  });

  it('Extreme Fear adds its extra weight to the score', () => {
    const r = computeRegime({ fearGreed: 10, etfFlowScore: 1, fundingRate: -0.08, oiVsPriceScore: 1 });
    expect(r.score).toBe(4.5);
    expect(r.normalizedScore).toBeCloseTo(4.5 / 4);
    expect(r.verdict.label).toBe('Strongly Bullish');
  });

  it('Extreme Greed against one bullish signal lands on the Neutral edge', () => {
    // -1.5 + 1 = -0.5 over 2 active → -0.25, which is still Neutral (Neutral is -0.25 to +0.25)
    const r = computeRegime({ fearGreed: 90, etfFlowScore: 1, fundingRate: 0, oiVsPriceScore: 0 });
    expect(r.score).toBe(-0.5);
    expect(r.normalizedScore).toBeCloseTo(-0.25);
    expect(r.verdict.label).toBe('Neutral');
  });

  it('1 of 4 active, that one bullish → Strongly Bullish (neutral signals do not dilute)', () => {
    const r = computeRegime({ ...base, etfFlowScore: 1 });
    expect(r.score).toBe(1);
    expect(r.normalizedScore).toBe(1);
    expect(r.verdict.label).toBe('Strongly Bullish');
  });

  it('2 bullish + 1 bearish + 1 neutral → ~0.33, Cautiously Bullish', () => {
    const r = computeRegime({ fearGreed: 30, etfFlowScore: 1, fundingRate: 0.15, oiVsPriceScore: 0 });
    expect(r.score).toBe(1);
    expect(r.normalizedScore).toBeCloseTo(1 / 3);
    expect(r.verdict.label).toBe('Cautiously Bullish');
  });

  it('all neutral → Neutral', () => {
    const r = computeRegime(base);
    expect(r.score).toBe(0);
    expect(r.normalizedScore).toBe(0);
    expect(r.verdict.label).toBe('Neutral');
    expect(r.verdict.color).toBe('grey');
  });

  it('2 bearish + 1 bullish → ~-0.33, Cautiously Bearish', () => {
    const r = computeRegime({ fearGreed: 60, etfFlowScore: -1, fundingRate: -0.08, oiVsPriceScore: 0 });
    expect(r.normalizedScore).toBeCloseTo(-1 / 3);
    expect(r.verdict.label).toBe('Cautiously Bearish');
  });

  it('all 4 bearish → Strongly Bearish', () => {
    const r = computeRegime({ fearGreed: 60, etfFlowScore: -1, fundingRate: 0.15, oiVsPriceScore: -1 });
    expect(r.score).toBe(-4);
    expect(r.normalizedScore).toBe(-1);
    expect(r.verdict.label).toBe('Strongly Bearish');
    expect(r.verdict.color).toBe('red');
  });
});

describe('computeRegime — confidence (share of ACTIVE signals)', () => {
  it('is 1.0 when all active signals agree', () => {
    expect(computeRegime({ fearGreed: 30, etfFlowScore: 1, fundingRate: -0.08, oiVsPriceScore: 1 }).confidence).toBe(1);
  });

  it('is 1.0 when 3 agree and the 4th is neutral (neutral signals no longer pull it down)', () => {
    // before the fix this read 0.75 (3 of all 4)
    expect(computeRegime({ fearGreed: 30, etfFlowScore: 1, fundingRate: -0.08, oiVsPriceScore: 0 }).confidence).toBe(1);
  });

  it('is 2/3 when 2 of 3 active signals agree', () => {
    expect(computeRegime({ fearGreed: 30, etfFlowScore: 1, fundingRate: 0.15, oiVsPriceScore: 0 }).confidence).toBeCloseTo(2 / 3);
  });

  it('counts an extreme F&G as one agreeing signal, not 1.5', () => {
    expect(computeRegime({ fearGreed: 10, etfFlowScore: -1, fundingRate: 0, oiVsPriceScore: 0 }).confidence).toBe(0.5);
  });

  it('is 0 with no active signals', () => {
    expect(computeRegime(base).confidence).toBe(0);
  });

  it('has no per-coin cap any more (v1.17: the HYPE 0.70 cap is replaced by the signal-count rule)', () => {
    const all = { fearGreed: 30, etfFlowScore: 1 as const, fundingRate: -0.08, oiVsPriceScore: 1 as const };
    expect(computeRegime(all).confidence).toBe(1);
  });
});

// Rachelle v1.17 Plus §1: one confidence rule for the Global Regime and every coin chip.
//   0 active signals     → "Neutral · Low Signal"
//   1–2 active signals   → "Leaning Bullish / Bearish" at most ("Neutral · Low Signal" under 0.60)
//   3–4 active signals   → ≥ 0.75 full verdict · 0.60–0.75 "Leaning …" · < 0.60 "Neutral · Low Signal"
describe('confidenceVerdict (v1.17 one confidence rule)', () => {
  const v = (i: RegimeInputs) => confidenceVerdict(computeRegime(i)).label;

  it('0 active signals → Neutral · Low Signal', () => {
    expect(v(base)).toBe('Neutral · Low Signal');
  });

  it('1 agreeing signal (100% confidence) is only "Leaning", never the full verdict', () => {
    expect(v({ ...base, etfFlowScore: 1 })).toBe('Leaning Bullish');
    expect(v({ ...base, fundingRate: 0.15 })).toBe('Leaning Bearish');
  });

  it('2 of 2 agreeing → Leaning; 1 of 2 (0.50) → Neutral · Low Signal', () => {
    expect(v({ ...base, etfFlowScore: 1, oiVsPriceScore: 1 })).toBe('Leaning Bullish');
    expect(v({ ...base, fearGreed: 10, etfFlowScore: -1 })).toBe('Neutral · Low Signal');
  });

  it('3–4 signals use the normal floors', () => {
    expect(v({ fearGreed: 30, etfFlowScore: 1, fundingRate: -0.08, oiVsPriceScore: 1 })).toBe('Strongly Bullish'); // 4/4
    expect(v({ fearGreed: 30, etfFlowScore: 1, fundingRate: -0.08, oiVsPriceScore: -1 })).toBe('Cautiously Bullish'); // 3/4 = 0.75
    expect(v({ fearGreed: 30, etfFlowScore: 1, fundingRate: 0.15, oiVsPriceScore: 0 })).toBe('Leaning Bullish'); // 2/3 ≈ 0.67
  });

  it('opposing signals that cancel out read Neutral', () => {
    expect(v({ ...base, etfFlowScore: 1, oiVsPriceScore: -1 })).toBe('Neutral');
  });

  it('colours: full verdicts keep theirs, Leaning is grey-green / grey-red, Low Signal is grey', () => {
    expect(confidenceVerdict(computeRegime({ ...base, etfFlowScore: 1 })).color).toBe('grey-green');
    expect(confidenceVerdict(computeRegime({ ...base, fundingRate: 0.15 })).color).toBe('grey-red');
    expect(confidenceVerdict(computeRegime(base)).color).toBe('grey');
  });
});
