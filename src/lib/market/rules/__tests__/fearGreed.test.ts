import { describe, it, expect } from 'vitest';
import { classifyFearGreed } from '../regime';

/**
 * Unit tests for classifyFearGreed.
 * Thresholds (matching original MarketConditions.tsx client logic):
 *   >= 75 → "Extreme Greed" / red
 *   >= 60 → "Greed"         / amber
 *   >= 40 → "Neutral"       / grey
 *   >= 25 → "Fear"          / lime
 *    < 25 → "Extreme Fear"  / green
 */
describe('classifyFearGreed — labels', () => {
  it('returns "Extreme Greed" at 75 (boundary)', () => {
    expect(classifyFearGreed(75).label).toBe('Extreme Greed');
  });

  it('returns "Extreme Greed" above 75', () => {
    expect(classifyFearGreed(90).label).toBe('Extreme Greed');
  });

  it('returns "Extreme Greed" at 100', () => {
    expect(classifyFearGreed(100).label).toBe('Extreme Greed');
  });

  it('returns "Greed" at 60 (boundary)', () => {
    expect(classifyFearGreed(60).label).toBe('Greed');
  });

  it('returns "Greed" just below 75', () => {
    expect(classifyFearGreed(74).label).toBe('Greed');
  });

  it('returns "Neutral" at 40 (boundary)', () => {
    expect(classifyFearGreed(40).label).toBe('Neutral');
  });

  it('returns "Neutral" just below 60', () => {
    expect(classifyFearGreed(59).label).toBe('Neutral');
  });

  it('returns "Fear" at 25 (boundary)', () => {
    expect(classifyFearGreed(25).label).toBe('Fear');
  });

  it('returns "Fear" just below 40', () => {
    expect(classifyFearGreed(39).label).toBe('Fear');
  });

  it('returns "Extreme Fear" just below 25', () => {
    expect(classifyFearGreed(24).label).toBe('Extreme Fear');
  });

  it('returns "Extreme Fear" at 0', () => {
    expect(classifyFearGreed(0).label).toBe('Extreme Fear');
  });
});

describe('classifyFearGreed — colors', () => {
  it('returns red at 75', () => {
    expect(classifyFearGreed(75).color).toBe('red');
  });

  it('returns amber at 60', () => {
    expect(classifyFearGreed(60).color).toBe('amber');
  });

  it('returns grey at 40', () => {
    expect(classifyFearGreed(40).color).toBe('grey');
  });

  it('returns lime at 25', () => {
    expect(classifyFearGreed(25).color).toBe('lime');
  });

  it('returns green at 24 (just below Fear threshold)', () => {
    expect(classifyFearGreed(24).color).toBe('green');
  });

  it('returns green at 0', () => {
    expect(classifyFearGreed(0).color).toBe('green');
  });
});
