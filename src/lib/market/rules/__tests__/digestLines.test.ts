import { describe, it, expect } from 'vitest';
import { digestUsd, topSmartMoneyOpens } from '../digestLines';
import type { FlowEvent } from '../../contracts';

const now = Date.parse('2026-10-20T08:00:00Z');
const ev = (id: string, over: Partial<FlowEvent>): FlowEvent => ({
  id, type: 'smart_money', asset: 'BTC', amountUsd: 1e6, direction: 'Smart Money', severity: 'MED',
  description: '', ts: '2026-10-20T07:00:00Z', action: 'open', ...over,
});

describe('topSmartMoneyOpens (v1.15 Pro §1)', () => {
  it('keeps opens from the last 24h, largest first, max 3', () => {
    const out = topSmartMoneyOpens([
      ev('a', { amountUsd: 5e6 }),
      ev('b', { amountUsd: 9e6 }),
      ev('c', { amountUsd: 7e6 }),
      ev('d', { amountUsd: 2e6 }),
      ev('closed', { amountUsd: 50e6, action: 'close' }),
      ev('old', { amountUsd: 40e6, ts: '2026-10-19T07:59:00Z' }),
      ev('whale', { amountUsd: 60e6, type: 'whale_transfer' }),
    ], now);
    expect(out.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
  it('returns nothing when no opens are known', () => {
    expect(topSmartMoneyOpens([ev('x', { action: undefined })], now)).toEqual([]);
  });
});

describe('digestUsd', () => {
  it('formats compact amounts', () => {
    expect(digestUsd(9_928_320)).toBe('$9.9M');
    expect(digestUsd(1.24e9)).toBe('$1.2B');
    expect(digestUsd(640_000)).toBe('$640K');
  });
});
