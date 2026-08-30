import { describe, it, expect } from 'vitest';
import {
  classifyPrice,
  classifyCvd,
  computeSpotVerdict,
  computeMarketVerdict,
  type SpotVerdict,
} from '../spotPulse';

const R = 10_000_000; // a sample 7-day CVD range (std-dev)

describe('classifyPrice', () => {
  it('bands on ±1%', () => {
    expect(classifyPrice(2)).toBe('UP');
    expect(classifyPrice(0.5)).toBe('FLAT');
    expect(classifyPrice(-2)).toBe('DOWN');
  });
});

describe('classifyCvd', () => {
  it('flat within 2% of range, else directional', () => {
    expect(classifyCvd(R, R)).toBe('UP');
    expect(classifyCvd(-R, R)).toBe('DOWN');
    expect(classifyCvd(0.01 * R, R)).toBe('FLAT'); // below 2% of range
  });
});

describe('computeSpotVerdict — matrix', () => {
  const base = { spotCvdRange: R, futCvdRange: R };
  const up = 5_000_000, down = -5_000_000, flat = 0;

  it('price up + spot up + fut up (ratio>0.4) → REAL BUYING', () => {
    expect(computeSpotVerdict({ ...base, priceChange4h: 3, spotCvdChange: up, futCvdChange: up }).verdict).toBe('REAL BUYING');
  });
  it('price up + spot flat + fut up → SPECULATIVE', () => {
    expect(computeSpotVerdict({ ...base, priceChange4h: 3, spotCvdChange: flat, futCvdChange: up }).verdict).toBe('SPECULATIVE');
  });
  it('price up + spot down + fut up → DISTRIBUTION', () => {
    expect(computeSpotVerdict({ ...base, priceChange4h: 3, spotCvdChange: down, futCvdChange: up }).verdict).toBe('DISTRIBUTION');
  });
  it('price flat + spot up → ACCUMULATION', () => {
    expect(computeSpotVerdict({ ...base, priceChange4h: 0, spotCvdChange: up, futCvdChange: flat }).verdict).toBe('ACCUMULATION');
  });
  it('price down + spot up → REVERSAL SETUP (with glow)', () => {
    const r = computeSpotVerdict({ ...base, priceChange4h: -3, spotCvdChange: up, futCvdChange: flat });
    expect(r.verdict).toBe('REVERSAL SETUP');
    expect(r.glow).toBe(true);
  });
  it('price down + spot down + fut down → COHERENT DECLINE', () => {
    expect(computeSpotVerdict({ ...base, priceChange4h: -3, spotCvdChange: down, futCvdChange: down }).verdict).toBe('COHERENT DECLINE');
  });
  it('price down + spot flat + fut down → FORCED DECLINE', () => {
    expect(computeSpotVerdict({ ...base, priceChange4h: -3, spotCvdChange: flat, futCvdChange: down }).verdict).toBe('FORCED DECLINE');
  });
  it('unmatched combo → BALANCED', () => {
    expect(computeSpotVerdict({ ...base, priceChange4h: 3, spotCvdChange: up, futCvdChange: down }).verdict).toBe('BALANCED');
  });
});

describe('computeMarketVerdict — thresholds scale with tier', () => {
  const mk = (v: SpotVerdict, n: number): SpotVerdict[] => Array.from({ length: n }, () => v);

  it('Plus: 3/5 buying → Broad Buying', () => {
    expect(computeMarketVerdict([...mk('REAL BUYING', 3), 'BALANCED', 'BALANCED'], 'plus')).toBe('Broad Buying');
  });
  it('Plus: 2/5 speculative → Speculation Dominant', () => {
    expect(computeMarketVerdict([...mk('SPECULATIVE', 2), 'BALANCED', 'BALANCED', 'BALANCED'], 'plus')).toBe('Speculation Dominant');
  });
  it('Pro: needs 6/10 buying for Broad Buying (5 is not enough)', () => {
    expect(computeMarketVerdict([...mk('REAL BUYING', 5), ...mk('BALANCED', 5)], 'pro')).not.toBe('Broad Buying');
    expect(computeMarketVerdict([...mk('REAL BUYING', 6), ...mk('BALANCED', 4)], 'pro')).toBe('Broad Buying');
  });
  it('all balanced → Mixed Market', () => {
    expect(computeMarketVerdict(mk('BALANCED', 5), 'plus')).toBe('Mixed Market');
  });
});
