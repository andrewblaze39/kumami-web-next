import { describe, it, expect } from 'vitest';
import { computeOi } from '../oi';

// Doc lines 859–868 (matrix section), 316–326 (summary).
// 6-cell OI-direction × price-direction matrix:
//   OI↑ + Price↑    → "Trend Strengthening"   green
//   OI↑ + Price flat → "Leverage Building"    amber
//   OI↑ + Price↓    → "Overleveraged Market"  red
//   OI↓ + Price↑    → "Short Covering Rally"  amber
//   OI↓ + Price flat → "Deleveraging"         grey
//   OI↓ + Price↓    → "Capitulation/Unwind"   grey

describe('computeOi — 6-cell OI × price matrix', () => {
  it('OI up + Price up → Trend Strengthening (green)', () => {
    const r = computeOi({ oiDirection: 'up', priceDirection: 'up' });
    expect(r.verdict.label).toBe('Trend Strengthening');
    expect(r.verdict.color).toBe('green');
  });

  it('OI up + Price flat → Leverage Building (amber)', () => {
    const r = computeOi({ oiDirection: 'up', priceDirection: 'flat' });
    expect(r.verdict.label).toBe('Leverage Building');
    expect(r.verdict.color).toBe('amber');
  });

  it('OI up + Price down → Overleveraged Market (red)', () => {
    const r = computeOi({ oiDirection: 'up', priceDirection: 'down' });
    expect(r.verdict.label).toBe('Overleveraged Market');
    expect(r.verdict.color).toBe('red');
  });

  it('OI down + Price up → Short Covering Rally (amber)', () => {
    const r = computeOi({ oiDirection: 'down', priceDirection: 'up' });
    expect(r.verdict.label).toBe('Short Covering Rally');
    expect(r.verdict.color).toBe('amber');
  });

  it('OI down + Price flat → Deleveraging (grey)', () => {
    const r = computeOi({ oiDirection: 'down', priceDirection: 'flat' });
    expect(r.verdict.label).toBe('Deleveraging');
    expect(r.verdict.color).toBe('grey');
  });

  it('OI down + Price down → Capitulation/Unwind (grey)', () => {
    const r = computeOi({ oiDirection: 'down', priceDirection: 'down' });
    expect(r.verdict.label).toBe('Capitulation/Unwind');
    expect(r.verdict.color).toBe('grey');
  });
});

describe('computeOi — OI flat fallback (unlisted in doc matrix)', () => {
  it('OI flat + any price direction → Stable OI (grey)', () => {
    const r = computeOi({ oiDirection: 'flat', priceDirection: 'up' });
    expect(r.verdict.label).toBe('Stable OI');
    expect(r.verdict.color).toBe('grey');
  });

  it('OI flat + price flat → Stable OI', () => {
    const r = computeOi({ oiDirection: 'flat', priceDirection: 'flat' });
    expect(r.verdict.label).toBe('Stable OI');
  });

  it('OI flat + price down → Stable OI', () => {
    const r = computeOi({ oiDirection: 'flat', priceDirection: 'down' });
    expect(r.verdict.label).toBe('Stable OI');
  });
});

describe('computeOi — tags are always empty (no modifiers in doc)', () => {
  it('no tags for any cell', () => {
    const cells = [
      { oiDirection: 'up', priceDirection: 'up' },
      { oiDirection: 'up', priceDirection: 'flat' },
      { oiDirection: 'up', priceDirection: 'down' },
      { oiDirection: 'down', priceDirection: 'up' },
      { oiDirection: 'down', priceDirection: 'flat' },
      { oiDirection: 'down', priceDirection: 'down' },
    ] as const;
    for (const cell of cells) {
      const r = computeOi(cell);
      expect(r.tags).toHaveLength(0);
    }
  });
});
