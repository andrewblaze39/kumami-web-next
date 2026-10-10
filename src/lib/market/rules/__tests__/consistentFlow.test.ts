import { describe, it, expect } from 'vitest';
import {
  lastNDays, mergeTallies, rankConsistentFlow, tallyDay, type FlowDailyDoc,
} from '../consistentFlow';
import type { FlowEvent } from '../../contracts';

const t = (maxEvents: number, maxUsd: number, extra: Partial<{ high: number; bullish: number; bearish: number }> = {}) => ({
  maxEvents, maxUsd, high: 0, bullish: 0, bearish: 0, ...extra,
});

describe('rankConsistentFlow', () => {
  const days: FlowDailyDoc[] = [
    { date: '2026-10-04', assets: { DOGE: t(2, 50e6), LINK: t(1, 10e6), BTC: t(9, 900e6) } },
    { date: '2026-10-05', assets: { DOGE: t(1, 5e6), LINK: t(3, 80e6) } },
    { date: '2026-10-06', assets: { DOGE: t(1, 5e6), SUI: t(5, 300e6, { high: 2, bullish: 4 }) } },
  ];

  it('ranks by days present, then total USD, excluding anchors/pins', () => {
    const out = rankConsistentFlow(days, new Set(['BTC']));
    expect(out.map((c) => c.asset)).toEqual(['DOGE', 'LINK', 'SUI']);
    expect(out[0].daysPresent).toBe(3);
    expect(out[0].reasons[0]).toBe('In Flow Radar 3 of the last 7 days');
  });

  it('breaks ties by USD and respects the limit', () => {
    const out = rankConsistentFlow(days, new Set(['BTC', 'DOGE']), 1);
    expect(out.map((c) => c.asset)).toEqual(['LINK']); // 2 days, $90M beats SUI (1 day)
  });

  it('describes the flow lean and HIGH events', () => {
    const sui = rankConsistentFlow(days, new Set(['BTC', 'DOGE', 'LINK']))[0];
    expect(sui.reasons).toContain('2 HIGH-severity events');
    expect(sui.reasons[1]).toMatch(/mostly bullish flow/);
  });

  it('never picks stablecoins', () => {
    const out = rankConsistentFlow([{ date: '2026-10-06', assets: { USDC: t(9, 900e6), USDT: t(9, 900e6), PEPE: t(1, 1e6) } }], new Set());
    expect(out.map((c) => c.asset)).toEqual(['PEPE']);
  });

  it('ignores coins with zero events and handles empty history', () => {
    expect(rankConsistentFlow([{ date: '2026-10-06', assets: { X: t(0, 0) } }], new Set())).toEqual([]);
    expect(rankConsistentFlow([], new Set())).toEqual([]);
  });
});

describe('tallyDay / mergeTallies', () => {
  const ev = (asset: string, severity: FlowEvent['severity'], ts: string, amountUsd = 1e6, direction: FlowEvent['direction'] = 'Outflow') =>
    ({ id: `${asset}-${ts}`, type: 'whale_transfer', asset, amountUsd, direction, severity, description: '', ts }) as FlowEvent;

  it('counts HIGH/MED events of that UTC day only', () => {
    const out = tallyDay([
      ev('DOGE', 'HIGH', '2026-10-10T01:00:00Z', 20e6),
      ev('DOGE', 'MED', '2026-10-10T02:00:00Z', 5e6, 'Inflow'),
      ev('DOGE', 'LOW', '2026-10-10T03:00:00Z'),
      ev('DOGE', 'HIGH', '2026-10-09T23:00:00Z'),
    ], '2026-10-10');
    expect(out.DOGE).toEqual({ maxEvents: 2, maxUsd: 25e6, high: 1, bullish: 1, bearish: 1 });
  });

  it('merges overlapping snapshots with a field-wise max (never sums)', () => {
    const merged = mergeTallies({ DOGE: t(3, 10e6, { high: 1 }) }, { DOGE: t(2, 40e6), LINK: t(1, 1e6) });
    expect(merged.DOGE).toEqual(t(3, 40e6, { high: 1 }));
    expect(merged.LINK).toEqual(t(1, 1e6));
  });
});

describe('lastNDays', () => {
  it('keeps the 7 calendar days ending today', () => {
    const docs = ['2026-10-02', '2026-10-03', '2026-10-09', '2026-10-10', '2026-10-11'].map((date) => ({ date, assets: {} }));
    expect(lastNDays(docs, '2026-10-10').map((d) => d.date)).toEqual(['2026-10-09', '2026-10-10']);
  });
});
