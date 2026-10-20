import { describe, it, expect } from 'vitest';
import {
  classifyFlow, classifyPrice, computeMarketVerdict, computeSpotVerdict, divergenceScore,
  verdictFor, windowStats, type SpotDir, type SpotVerdict,
} from '../spotPulse';

// Rachelle v1.15 Plus §2.9.

describe('classifyPrice — bands scale with the window', () => {
  it('4H ±0.75% · 24H ±1.5% · 7D ±4%', () => {
    expect(classifyPrice(0.8, '4H')).toBe('UP');
    expect(classifyPrice(0.7, '4H')).toBe('FLAT');
    expect(classifyPrice(1.4, '24H')).toBe('FLAT');
    expect(classifyPrice(-1.6, '24H')).toBe('DOWN');
    expect(classifyPrice(3.9, '7D')).toBe('FLAT');
    expect(classifyPrice(4.1, '7D')).toBe('UP');
  });
});

describe('classifyFlow — UP/DOWN only beyond 0.5× the normal swing', () => {
  it('z ±0.5', () => {
    expect(classifyFlow(51, 100)).toBe('UP');
    expect(classifyFlow(50, 100)).toBe('FLAT');
    expect(classifyFlow(-49, 100)).toBe('FLAT');
    expect(classifyFlow(-51, 100)).toBe('DOWN');
  });
  it('FLAT is now reachable (v1.14\'s 2% of std-dev made it near impossible)', () => {
    expect(classifyFlow(10, 100)).toBe('FLAT');
  });
  it('no swing → FLAT', () => {
    expect(classifyFlow(1e9, 0)).toBe('FLAT');
  });
});

describe('windowStats', () => {
  it('sums the current window and takes the std-dev of the past same-length windows', () => {
    // 4H windows: 10 past windows of +4 total each (1 per bar) except alternating, then current +40.
    const past = Array.from({ length: 40 }, (_, i) => (Math.floor(i / 4) % 2 === 0 ? 1 : -1));
    const flows = [...past, 10, 10, 10, 10];
    const s = windowStats(flows, '4H');
    expect(s.delta).toBe(40);
    expect(s.pastWindows).toBe(10);
    expect(s.swing).toBeCloseTo(4); // windows alternate +4 / −4
  });
  it('caps the past windows at the spec count (4H → 42)', () => {
    const s = windowStats(Array(2016).fill(1), '4H');
    expect(s.pastWindows).toBe(42);
  });
  it('84 days of 1H bars give 7D its 11 past windows', () => {
    expect(windowStats(Array(2016).fill(1), '7D').pastWindows).toBe(11);
  });
  it('too few bars → 0 past windows', () => {
    expect(windowStats([1, 2], '4H')).toEqual({ delta: 0, swing: 0, pastWindows: 0 });
  });
});

describe('verdictFor — every one of the 27 combinations has an answer', () => {
  const dirs: SpotDir[] = ['UP', 'FLAT', 'DOWN'];
  const expected = (p: SpotDir, s: SpotDir, f: SpotDir, r: number): SpotVerdict => {
    if (p === 'UP' && s === 'UP') return f === 'UP' ? (r > 0.4 ? 'REAL BUYING' : 'SPECULATIVE') : 'REAL BUYING';
    if (p === 'UP' && s === 'FLAT') return f === 'UP' ? 'SPECULATIVE' : 'BALANCED';
    if (p === 'UP' && s === 'DOWN') return 'DISTRIBUTION';
    if (p === 'FLAT' && s === 'UP') return 'ACCUMULATION';
    if (p === 'FLAT' && s === 'DOWN') return 'QUIET DISTRIBUTION';
    if (p === 'FLAT') return 'BALANCED';
    if (s === 'UP') return 'REVERSAL SETUP';
    if (s === 'DOWN') return 'COHERENT DECLINE';
    return f === 'DOWN' ? 'FORCED DECLINE' : 'BALANCED';
  };
  for (const p of dirs) for (const s of dirs) for (const f of dirs) {
    it(`${p} · ${s} · ${f}`, () => {
      expect(verdictFor(p, s, f, 0.5)).toBe(expected(p, s, f, 0.5));
      expect(verdictFor(p, s, f, 0.3)).toBe(expected(p, s, f, 0.3));
    });
  }
  it('spot-led rallies are REAL BUYING (v1.14 dropped them to BALANCED)', () => {
    expect(verdictFor('UP', 'UP', 'FLAT', 9)).toBe('REAL BUYING');
    expect(verdictFor('UP', 'UP', 'DOWN', 9)).toBe('REAL BUYING');
  });
});

describe('computeSpotVerdict', () => {
  const base = { timeframe: '4H' as const, priceChangePct: 0, spotDelta: 0, futDelta: 0, spotSwing: 100, futSwing: 100, pastWindows: 42 };
  it('FLAT price + spot selling → QUIET DISTRIBUTION', () => {
    expect(computeSpotVerdict({ ...base, spotDelta: -80 }).verdict).toBe('QUIET DISTRIBUTION');
  });
  it('fewer than 8 past windows → BALANCED with notEnoughHistory', () => {
    const r = computeSpotVerdict({ ...base, priceChangePct: 3, spotDelta: 900, pastWindows: 7 });
    expect(r.verdict).toBe('BALANCED');
    expect(r.notEnoughHistory).toBe(true);
  });
});

describe('computeMarketVerdict — shares, bearish before speculation', () => {
  const v = (...xs: SpotVerdict[]) => xs;
  it('fewer than 4 tiles with data → Not enough data', () => {
    expect(computeMarketVerdict(v('REAL BUYING', 'REAL BUYING', 'REAL BUYING'))).toBe('Not enough data');
  });
  it('≥ 60% bullish and ≤ 20% bearish → Broad Buying (5 and 10 tiles)', () => {
    expect(computeMarketVerdict(v('REAL BUYING', 'ACCUMULATION', 'REVERSAL SETUP', 'BALANCED', 'DISTRIBUTION'))).toBe('Broad Buying');
    expect(computeMarketVerdict(v('REAL BUYING', 'REAL BUYING', 'REAL BUYING', 'ACCUMULATION', 'ACCUMULATION', 'REVERSAL SETUP', 'BALANCED', 'BALANCED', 'SPECULATIVE', 'DISTRIBUTION'))).toBe('Broad Buying');
  });
  it('distribution is checked before speculation', () => {
    expect(computeMarketVerdict(v('SPECULATIVE', 'SPECULATIVE', 'DISTRIBUTION', 'QUIET DISTRIBUTION', 'BALANCED'))).toBe('Distribution Wave');
  });
  it('≥ 40% declines → Broad Selloff', () => {
    expect(computeMarketVerdict(v('COHERENT DECLINE', 'FORCED DECLINE', 'BALANCED', 'BALANCED', 'BALANCED'))).toBe('Broad Selloff');
  });
  it('Selective Accumulation needs no distribution at all', () => {
    expect(computeMarketVerdict(v('ACCUMULATION', 'ACCUMULATION', 'BALANCED', 'BALANCED', 'BALANCED'))).toBe('Selective Accumulation');
    expect(computeMarketVerdict(v('ACCUMULATION', 'ACCUMULATION', 'QUIET DISTRIBUTION', 'BALANCED', 'BALANCED'))).not.toBe('Selective Accumulation');
  });
  it('≥ 40% speculative → Speculation Dominant; otherwise Mixed Market', () => {
    expect(computeMarketVerdict(v('SPECULATIVE', 'SPECULATIVE', 'BALANCED', 'BALANCED', 'BALANCED'))).toBe('Speculation Dominant');
    expect(computeMarketVerdict(v('SPECULATIVE', 'ACCUMULATION', 'BALANCED', 'BALANCED', 'BALANCED'))).toBe('Mixed Market');
  });
});

describe('divergenceScore', () => {
  it('QUIET DISTRIBUTION scores +4', () => {
    const r = computeSpotVerdict({ timeframe: '4H', priceChangePct: 0, spotDelta: -80, futDelta: 0, spotSwing: 100, futSwing: 100, pastWindows: 42 });
    expect(divergenceScore(r, { asset: 'SOL', spotDelta: -80, priceChangePct: 0 })).toBe(4);
  });
});
