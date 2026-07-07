import { describe, it, expect } from 'vitest';
import {
  formatUsd,
  formatPrice,
  formatChange,
  formatConfidence,
  relativeTime,
  formatTime,
  verdictColorClass,
} from './format';

describe('formatUsd', () => {
  it('formats billions with one decimal', () => {
    expect(formatUsd(1_200_000_000)).toBe('$1.2B');
    expect(formatUsd(2_500_000_000)).toBe('$2.5B');
  });

  it('formats negative billions', () => {
    expect(formatUsd(-1_200_000_000)).toBe('-$1.2B');
  });

  it('formats millions rounded to whole number', () => {
    expect(formatUsd(50_000_000)).toBe('$50M');
    expect(formatUsd(-50_000_000)).toBe('-$50M');
  });

  it('formats thousands with K', () => {
    expect(formatUsd(500_000)).toBe('$500K');
    expect(formatUsd(1_500)).toBe('$2K');
  });

  it('formats sub-thousand values', () => {
    expect(formatUsd(42)).toBe('$42');
    expect(formatUsd(0)).toBe('$0');
  });

  it('handles zero correctly', () => {
    expect(formatUsd(0)).toBe('$0');
  });
});

describe('formatPrice', () => {
  it('formats large prices with commas and 2dp', () => {
    expect(formatPrice(65_432.5)).toBe('65,432.50');
    expect(formatPrice(1_000)).toBe('1,000.00');
  });

  it('formats mid-range prices with 2dp', () => {
    expect(formatPrice(2_500.1)).toBe('2,500.10');
    expect(formatPrice(1.5)).toBe('1.50');
  });

  it('formats micro prices with 4dp', () => {
    expect(formatPrice(0.1234)).toBe('0.1234');
    expect(formatPrice(0.0001)).toBe('0.0001');
  });
});

describe('formatChange', () => {
  it('prefixes positive values with +', () => {
    expect(formatChange(2.5)).toBe('+2.5%');
    expect(formatChange(0)).toBe('+0.0%');
  });

  it('shows negative sign for negatives', () => {
    expect(formatChange(-1.3)).toBe('-1.3%');
    expect(formatChange(-0.1)).toBe('-0.1%');
  });
});

describe('formatConfidence', () => {
  it('rounds to nearest percent', () => {
    expect(formatConfidence(0.78)).toBe('78%');
    expect(formatConfidence(0.5)).toBe('50%');
    expect(formatConfidence(1)).toBe('100%');
    expect(formatConfidence(0)).toBe('0%');
  });

  it('rounds halves up', () => {
    expect(formatConfidence(0.785)).toBe('79%');
  });
});

describe('relativeTime', () => {
  it('returns "just now" for sub-minute differences', () => {
    const ts = new Date(Date.now() - 30_000).toISOString();
    expect(relativeTime(ts)).toBe('just now');
  });

  it('returns "just now" for future timestamps', () => {
    const ts = new Date(Date.now() + 5_000).toISOString();
    expect(relativeTime(ts)).toBe('just now');
  });

  it('returns minutes for 1–59 minute diffs', () => {
    const ts = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relativeTime(ts)).toBe('5m ago');
  });

  it('returns hours for 1–23 hour diffs', () => {
    const ts = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(relativeTime(ts)).toBe('3h ago');
  });

  it('returns days for 24h+ diffs', () => {
    const ts = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(relativeTime(ts)).toBe('2d ago');
  });

  it('returns exactly 1h for 60 minute diffs', () => {
    const ts = new Date(Date.now() - 60 * 60_000).toISOString();
    expect(relativeTime(ts)).toBe('1h ago');
  });
});

describe('formatTime', () => {
  it('formats an ISO timestamp as HH:MM UTC', () => {
    // Use a fixed ISO string to avoid timezone issues
    const ts = '2024-06-15T14:32:00.000Z';
    expect(formatTime(ts)).toBe('14:32 UTC');
  });

  it('zero-pads hours and minutes', () => {
    const ts = '2024-06-15T03:05:00.000Z';
    expect(formatTime(ts)).toBe('03:05 UTC');
  });
});

describe('verdictColorClass', () => {
  it('returns w-verdict- prefixed class for each color', () => {
    expect(verdictColorClass('green')).toBe('w-verdict-green');
    expect(verdictColorClass('grey-green')).toBe('w-verdict-grey-green');
    expect(verdictColorClass('grey')).toBe('w-verdict-grey');
    expect(verdictColorClass('amber')).toBe('w-verdict-amber');
    expect(verdictColorClass('grey-red')).toBe('w-verdict-grey-red');
    expect(verdictColorClass('red')).toBe('w-verdict-red');
  });
});
