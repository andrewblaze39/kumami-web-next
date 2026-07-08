import { describe, it, expect } from 'vitest';
import { computePortfolio24hDelta } from './portfolioDelta';

describe('computePortfolio24hDelta', () => {
  // ── happy-path ────────────────────────────────────────────────────────────

  it('returns hasPriceData=false and deltaValue=0 for an empty list', () => {
    const result = computePortfolio24hDelta([]);
    expect(result.hasPriceData).toBe(false);
    expect(result.deltaValue).toBe(0);
  });

  it('computes a positive delta for a holding that is up', () => {
    // value = 110, pct = +10  →  prev = 110 / 1.10 = 100  →  delta = 10
    const result = computePortfolio24hDelta([{ value: 110, change24h: 10 }]);
    expect(result.hasPriceData).toBe(true);
    expect(result.deltaValue).toBeCloseTo(10, 5);
  });

  it('computes a negative delta for a holding that is down', () => {
    // value = 90, pct = -10  →  prev = 90 / 0.90 = 100  →  delta = -10
    const result = computePortfolio24hDelta([{ value: 90, change24h: -10 }]);
    expect(result.hasPriceData).toBe(true);
    expect(result.deltaValue).toBeCloseTo(-10, 5);
  });

  it('sums deltas across multiple holdings', () => {
    // up 10 (+10) + down 10 (-10) = 0
    const result = computePortfolio24hDelta([
      { value: 110, change24h: 10 },
      { value: 90, change24h: -10 },
    ]);
    expect(result.hasPriceData).toBe(true);
    expect(result.deltaValue).toBeCloseTo(0, 10);
  });

  // ── pct = -100 (dead token / divide-by-zero guard) ────────────────────────

  it('returns delta=0 (not Infinity/NaN) when pct = -100', () => {
    // pct = -100  →  prev clamped to item.value  →  delta = 0
    const result = computePortfolio24hDelta([{ value: 50, change24h: -100 }]);
    expect(result.hasPriceData).toBe(true);
    expect(Number.isFinite(result.deltaValue)).toBe(true);
    expect(result.deltaValue).toBe(0);
  });

  it('returns delta=0 (not Infinity/NaN) when pct < -100', () => {
    const result = computePortfolio24hDelta([{ value: 1, change24h: -150 }]);
    expect(result.hasPriceData).toBe(true);
    expect(Number.isFinite(result.deltaValue)).toBe(true);
    expect(result.deltaValue).toBe(0);
  });

  // ── null / undefined exclusion ────────────────────────────────────────────

  it('excludes holdings where change24h is null', () => {
    const result = computePortfolio24hDelta([{ value: 100, change24h: null }]);
    expect(result.hasPriceData).toBe(false);
    expect(result.deltaValue).toBe(0);
  });

  it('excludes holdings where change24h is undefined', () => {
    const result = computePortfolio24hDelta([{ value: 100, change24h: undefined }]);
    expect(result.hasPriceData).toBe(false);
    expect(result.deltaValue).toBe(0);
  });

  it('only includes holdings with non-null change24h when mixed', () => {
    // null holding should be ignored; only the +10% one counts
    const result = computePortfolio24hDelta([
      { value: 110, change24h: 10 },
      { value: 200, change24h: null },
      { value: 300, change24h: undefined },
    ]);
    expect(result.hasPriceData).toBe(true);
    expect(result.deltaValue).toBeCloseTo(10, 5);
  });

  it('returns hasPriceData=false when ALL holdings have null/undefined change24h', () => {
    const result = computePortfolio24hDelta([
      { value: 100, change24h: null },
      { value: 200 },
    ]);
    expect(result.hasPriceData).toBe(false);
    expect(result.deltaValue).toBe(0);
  });

  // ── value = 0 guard ───────────────────────────────────────────────────────

  it('excludes holdings with value=0 even if change24h is present', () => {
    const result = computePortfolio24hDelta([{ value: 0, change24h: 5 }]);
    expect(result.hasPriceData).toBe(false);
  });
});
