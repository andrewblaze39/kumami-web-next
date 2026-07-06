import { describe, it, expect } from 'vitest';
import { computeCVD, type CVDInputs } from '../cvd';

// Doc lines 675–723.
//
// 6-cell primary matrix (price direction × CVD direction):
//   Price UP   + CVD UP    → "Buyer-Led Rally"           (green)
//   Price UP   + CVD FLAT  → "Liquidity-Driven Rally"    (amber)
//   Price UP   + CVD DOWN  → "Distribution Rally"        (red)
//   Price DOWN + CVD DOWN  → "Seller-Led Decline"        (red)
//   Price DOWN + CVD FLAT  → "Forced Liquidation Decline" (amber)
//   Price DOWN + CVD UP    → "Accumulation Decline"      (green)
//
// Spot/Futures CVD divergence tags (doc lines 714–722):
//   Futures CVD rising + Spot CVD flat/falling → "· Speculative Move — Spot Not Confirming"
//   Spot CVD rising + Futures CVD flat         → "· Organic Move — Spot Leading"
//
// Inputs: price direction, CVD direction, spotCVDDirection, futuresCVDDirection
// Directions: 'up' | 'flat' | 'down'

describe('computeCVD — primary 6-cell matrix', () => {
  it('Buyer-Led Rally: price up + CVD up', () => {
    const r = computeCVD({ priceDirection: 'up', cvdDirection: 'up', spotCVDDirection: 'up', futuresCVDDirection: 'up' });
    expect(r.verdict.label).toBe('Buyer-Led Rally');
    expect(r.verdict.color).toBe('green');
  });

  it('Liquidity-Driven Rally: price up + CVD flat', () => {
    const r = computeCVD({ priceDirection: 'up', cvdDirection: 'flat', spotCVDDirection: 'flat', futuresCVDDirection: 'flat' });
    expect(r.verdict.label).toBe('Liquidity-Driven Rally');
    expect(r.verdict.color).toBe('amber');
  });

  it('Distribution Rally: price up + CVD down', () => {
    const r = computeCVD({ priceDirection: 'up', cvdDirection: 'down', spotCVDDirection: 'down', futuresCVDDirection: 'down' });
    expect(r.verdict.label).toBe('Distribution Rally');
    expect(r.verdict.color).toBe('red');
  });

  it('Seller-Led Decline: price down + CVD down', () => {
    const r = computeCVD({ priceDirection: 'down', cvdDirection: 'down', spotCVDDirection: 'down', futuresCVDDirection: 'down' });
    expect(r.verdict.label).toBe('Seller-Led Decline');
    expect(r.verdict.color).toBe('red');
  });

  it('Forced Liquidation Decline: price down + CVD flat', () => {
    const r = computeCVD({ priceDirection: 'down', cvdDirection: 'flat', spotCVDDirection: 'flat', futuresCVDDirection: 'flat' });
    expect(r.verdict.label).toBe('Forced Liquidation Decline');
    expect(r.verdict.color).toBe('amber');
  });

  it('Accumulation Decline: price down + CVD up', () => {
    const r = computeCVD({ priceDirection: 'down', cvdDirection: 'up', spotCVDDirection: 'up', futuresCVDDirection: 'up' });
    expect(r.verdict.label).toBe('Accumulation Decline');
    expect(r.verdict.color).toBe('green');
  });
});

describe('computeCVD — spot/futures divergence tags', () => {
  it('Speculative Move tag: futures CVD rising + spot CVD flat', () => {
    const r = computeCVD({
      priceDirection: 'up',
      cvdDirection: 'up',
      spotCVDDirection: 'flat',
      futuresCVDDirection: 'up',
    });
    expect(r.tags.some(t => t.label === '· Speculative Move — Spot Not Confirming')).toBe(true);
  });

  it('Speculative Move tag: futures CVD rising + spot CVD falling', () => {
    const r = computeCVD({
      priceDirection: 'up',
      cvdDirection: 'up',
      spotCVDDirection: 'down',
      futuresCVDDirection: 'up',
    });
    expect(r.tags.some(t => t.label === '· Speculative Move — Spot Not Confirming')).toBe(true);
  });

  it('Organic Move tag: spot CVD rising + futures CVD flat', () => {
    const r = computeCVD({
      priceDirection: 'up',
      cvdDirection: 'up',
      spotCVDDirection: 'up',
      futuresCVDDirection: 'flat',
    });
    expect(r.tags.some(t => t.label === '· Organic Move — Spot Leading')).toBe(true);
  });

  it('no divergence tag when both spot and futures CVD aligned (both up)', () => {
    const r = computeCVD({
      priceDirection: 'up',
      cvdDirection: 'up',
      spotCVDDirection: 'up',
      futuresCVDDirection: 'up',
    });
    expect(r.tags).toHaveLength(0);
  });

  it('no divergence tag when both flat', () => {
    const r = computeCVD({
      priceDirection: 'up',
      cvdDirection: 'flat',
      spotCVDDirection: 'flat',
      futuresCVDDirection: 'flat',
    });
    expect(r.tags).toHaveLength(0);
  });

  it('no divergence tag when both spot and futures down together', () => {
    const r = computeCVD({
      priceDirection: 'down',
      cvdDirection: 'down',
      spotCVDDirection: 'down',
      futuresCVDDirection: 'down',
    });
    expect(r.tags).toHaveLength(0);
  });
});
