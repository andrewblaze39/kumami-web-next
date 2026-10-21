import { describe, it, expect } from 'vitest';
import { computeFlowVerdict } from '../flowVerdict';
import type { FlowEvent } from '../../contracts';

// Rachelle v1.15 Plus §3 verdict band: cascade first, 1.5× dominance, window scaling.
const M = 1_000_000;
let n = 0;
const ev = (direction: FlowEvent['direction'], amountUsd: number, over: Partial<FlowEvent> = {}): FlowEvent => ({
  id: `e${n++}`, type: 'whale_transfer', asset: 'BTC', amountUsd, direction, severity: 'HIGH',
  description: '', ts: '2026-10-20T00:00:00Z', ...over,
});
const liq = (amountUsd: number, longShare: number) =>
  ev(longShare > 0.7 ? 'Long Flush' : longShare < 0.3 ? 'Short Squeeze' : 'Two-sided Flush', amountUsd, { type: 'liq_spike', longShare });

describe('computeFlowVerdict', () => {
  it('liquidation cascade wins first and is named by the side that was liquidated', () => {
    const longs = computeFlowVerdict([liq(250 * M, 0.9), liq(100 * M, 0.8), ev('Inflow', 900 * M), ev('Inflow', 1), ev('Inflow', 1)]);
    expect(longs.verdict.label).toBe('Long Liquidation Cascade');
    const shorts = computeFlowVerdict([liq(250 * M, 0.1), liq(100 * M, 0.2)]);
    expect(shorts.verdict.label).toBe('Short Squeeze Cascade');
  });

  it('$600M selling vs $900M buying is NOT a Distribution Wave — buying is 1.5× selling', () => {
    const r = computeFlowVerdict([
      ev('Inflow', 200 * M), ev('Inflow', 200 * M), ev('Inflow', 200 * M),
      ev('Outflow', 300 * M), ev('Outflow', 300 * M), ev('Outflow', 300 * M),
    ]);
    expect(r.verdict.label).not.toBe('Distribution Wave');
    expect(r.verdict.label).toBe('Broad Accumulation');
    const close = computeFlowVerdict([
      ev('Inflow', 200 * M), ev('Inflow', 200 * M), ev('Inflow', 200 * M),
      ev('Outflow', 250 * M), ev('Outflow', 250 * M), ev('Outflow', 250 * M),
    ]);
    expect(close.verdict.label).toBe('Mixed Flow'); // neither side 1.5× the other
  });

  it('Distribution Wave when bearish > $500M, ≥ 3 events and ≥ 1.5× bullish', () => {
    const r = computeFlowVerdict([ev('Inflow', 300 * M), ev('Long Flush', 150 * M, { type: 'liq_spike', longShare: 0.9 }), ev('Short Opened', 100 * M, { type: 'smart_money' }), ev('Outflow', 100 * M)]);
    expect(r.verdict.label).toBe('Distribution Wave');
    expect(r.verdict.color).toBe('red');
  });

  it('Broad Accumulation mirror, with the new bullish labels', () => {
    const r = computeFlowVerdict([ev('Outflow', 300 * M), ev('Dry Powder In', 150 * M, { type: 'exchange_flow', marketWide: true }), ev('Long Opened', 100 * M, { type: 'smart_money' })]);
    expect(r.verdict.label).toBe('Broad Accumulation');
  });

  it('thresholds scale with the window: $300M of selling is a wave in 1H but not in 4H', () => {
    const evs = [ev('Inflow', 100 * M), ev('Inflow', 100 * M), ev('Inflow', 100 * M)];
    expect(computeFlowVerdict(evs, '1H').verdict.label).toBe('Distribution Wave');
    expect(computeFlowVerdict(evs, '4H').verdict.label).toBe('Quiet Flow');
    const big = [ev('Inflow', 300 * M), ev('Inflow', 300 * M), ev('Inflow', 300 * M)];
    expect(computeFlowVerdict(big, '4H').verdict.label).toBe('Distribution Wave');
    expect(computeFlowVerdict(big, '24H').verdict.label).toBe('Quiet Flow'); // needs > $1.25B on 24H
  });

  it('neutral events are never counted', () => {
    const r = computeFlowVerdict([
      ev('Position Closed', 400 * M, { type: 'smart_money' }), ev('Position Closed', 400 * M, { type: 'smart_money' }),
      ev('Two-sided Flush', 100 * M, { type: 'liq_spike', longShare: 0.5 }), ev('Accumulation', 300 * M, { type: 'smart_money' }),
    ]);
    expect(r.verdict.label).toBe('Quiet Flow');
  });

  it('Mixed Flow needs 3 of each; otherwise Quiet', () => {
    expect(computeFlowVerdict([ev('Inflow', 1), ev('Inflow', 1), ev('Inflow', 1), ev('Outflow', 1), ev('Outflow', 1), ev('Outflow', 1)]).verdict.label).toBe('Mixed Flow');
    expect(computeFlowVerdict([ev('Inflow', 1), ev('Outflow', 1)]).verdict.label).toBe('Quiet Flow');
  });
});
