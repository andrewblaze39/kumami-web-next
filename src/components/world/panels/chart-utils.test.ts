import { describe, it, expect } from 'vitest';
import {
  computeDomain,
  scaleY,
  scaleX,
  buildLinePoints,
  buildAreaPath,
  buildSmoothPath,
} from './chart-utils';
import type { Series } from '@/lib/market/contracts';

// ---------------------------------------------------------------------------
// computeDomain
// ---------------------------------------------------------------------------

describe('computeDomain', () => {
  it('returns 0,1 for empty series', () => {
    expect(computeDomain([])).toEqual({ min: 0, max: 1 });
  });

  it('returns centred range for single-point series', () => {
    const result = computeDomain([{ t: 0, v: 5 }]);
    expect(result).toEqual({ min: 4.5, max: 5.5 });
  });

  it('returns min/max for multi-point series', () => {
    const series: Series = [
      { t: 0, v: 10 },
      { t: 1, v: 3 },
      { t: 2, v: 7 },
    ];
    expect(computeDomain(series)).toEqual({ min: 3, max: 10 });
  });

  it('expands a flat series (all same value) so range is non-zero', () => {
    const series: Series = [
      { t: 0, v: 5 },
      { t: 1, v: 5 },
      { t: 2, v: 5 },
    ];
    const d = computeDomain(series);
    expect(d.min).toBeLessThan(5);
    expect(d.max).toBeGreaterThan(5);
    expect(d.max - d.min).toBeGreaterThan(0);
  });

  it('handles negative values', () => {
    const series: Series = [
      { t: 0, v: -10 },
      { t: 1, v: -2 },
      { t: 2, v: -5 },
    ];
    expect(computeDomain(series)).toEqual({ min: -10, max: -2 });
  });
});

// ---------------------------------------------------------------------------
// scaleY
// ---------------------------------------------------------------------------

describe('scaleY', () => {
  it('maps min value to height (bottom of SVG)', () => {
    const domain = { min: 0, max: 100 };
    expect(scaleY(0, domain, 200)).toBe(200);
  });

  it('maps max value to 0 (top of SVG)', () => {
    const domain = { min: 0, max: 100 };
    expect(scaleY(100, domain, 200)).toBe(0);
  });

  it('maps midpoint to height/2', () => {
    const domain = { min: 0, max: 100 };
    expect(scaleY(50, domain, 200)).toBe(100);
  });

  it('returns height/2 for zero-range domain', () => {
    const domain = { min: 5, max: 5 };
    expect(scaleY(5, domain, 200)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// scaleX
// ---------------------------------------------------------------------------

describe('scaleX', () => {
  it('maps first index to 0', () => {
    expect(scaleX(0, 10, 300)).toBe(0);
  });

  it('maps last index to width', () => {
    expect(scaleX(9, 10, 300)).toBe(300);
  });

  it('maps middle index proportionally', () => {
    // index 5 of 11 points (0–10) → 5/10 * 300 = 150
    expect(scaleX(5, 11, 300)).toBeCloseTo(150);
  });

  it('returns 0 for single-point total', () => {
    expect(scaleX(0, 1, 300)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildLinePoints
// ---------------------------------------------------------------------------

describe('buildLinePoints', () => {
  it('returns empty string for empty series', () => {
    expect(buildLinePoints([], 200, 100)).toBe('');
  });

  it('returns a single point for a single-element series', () => {
    const series: Series = [{ t: 0, v: 5 }];
    const result = buildLinePoints(series, 200, 100);
    // Single point → x=0, y should be at height/2 since domain is expanded symmetrically
    expect(result).toContain('0.00');
    expect(result.split(' ').length).toBe(1);
  });

  it('generates correct number of coordinate pairs', () => {
    const series: Series = [
      { t: 0, v: 10 },
      { t: 1, v: 20 },
      { t: 2, v: 30 },
    ];
    const result = buildLinePoints(series, 200, 100);
    const pairs = result.split(' ');
    expect(pairs.length).toBe(3);
    pairs.forEach(pair => {
      expect(pair).toMatch(/^-?\d+\.\d+,-?\d+\.\d+$/);
    });
  });

  it('first x is 0 and last x equals width', () => {
    const series: Series = [
      { t: 0, v: 0 },
      { t: 1, v: 50 },
      { t: 2, v: 100 },
    ];
    const result = buildLinePoints(series, 200, 100);
    const pairs = result.split(' ');
    expect(pairs[0]).toMatch(/^0\.00,/);
    expect(pairs[2]).toMatch(/^200\.00,/);
  });

  it('min value maps to height, max value maps to 0', () => {
    const series: Series = [
      { t: 0, v: 0 },
      { t: 1, v: 100 },
    ];
    const result = buildLinePoints(series, 200, 100);
    const pairs = result.split(' ');
    // First point: min=0 → y=100 (height)
    expect(pairs[0]).toBe('0.00,100.00');
    // Last point: max=100 → y=0
    expect(pairs[1]).toBe('200.00,0.00');
  });

  it('handles a flat series without error', () => {
    const series: Series = Array.from({ length: 5 }, (_, i) => ({ t: i, v: 5 }));
    const result = buildLinePoints(series, 200, 100);
    expect(result).not.toBe('');
    expect(result.split(' ').length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// buildAreaPath
// ---------------------------------------------------------------------------

describe('buildAreaPath', () => {
  it('returns empty string for empty series', () => {
    expect(buildAreaPath([], 200, 100)).toBe('');
  });

  it('starts with M and ends with Z', () => {
    const series: Series = [
      { t: 0, v: 0 },
      { t: 1, v: 50 },
      { t: 2, v: 100 },
    ];
    const result = buildAreaPath(series, 200, 100);
    expect(result.startsWith('M')).toBe(true);
    expect(result.endsWith('Z')).toBe(true);
  });

  it('includes closing segment back to height', () => {
    const series: Series = [{ t: 0, v: 50 }, { t: 1, v: 50 }];
    const result = buildAreaPath(series, 200, 100);
    // Should contain a closing L that goes to the bottom
    expect(result).toContain('100 Z');
  });
});

// ---------------------------------------------------------------------------
// buildSmoothPath
// ---------------------------------------------------------------------------

describe('buildSmoothPath', () => {
  it('returns empty string for empty series', () => {
    expect(buildSmoothPath([], 200, 100)).toBe('');
  });

  it('returns an M command for a single-point series', () => {
    const series: Series = [{ t: 0, v: 5 }];
    const result = buildSmoothPath(series, 200, 100);
    expect(result.startsWith('M')).toBe(true);
  });

  it('uses C (cubic bezier) commands for multi-point series', () => {
    const series: Series = [
      { t: 0, v: 0 },
      { t: 1, v: 50 },
      { t: 2, v: 100 },
    ];
    const result = buildSmoothPath(series, 200, 100);
    expect(result).toContain('C');
  });

  it('path starts with M and first point coordinates', () => {
    const series: Series = [
      { t: 0, v: 0 },   // min → y = height
      { t: 1, v: 100 }, // max → y = 0
    ];
    const result = buildSmoothPath(series, 200, 100);
    expect(result.startsWith('M 0.00,100.00')).toBe(true);
  });
});
