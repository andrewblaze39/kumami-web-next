import { describe, it, expect } from 'vitest';
import { computeFlowVerdict } from '../flowVerdict';
import type { FlowEvent } from '../../contracts';

function ev(partial: Partial<FlowEvent>): FlowEvent {
  return {
    id: Math.random().toString(),
    type: 'whale_transfer',
    asset: 'BTC',
    amountUsd: 0,
    direction: 'Inflow',
    severity: 'HIGH',
    description: '',
    ts: new Date().toISOString(),
    ...partial,
  };
}

describe('computeFlowVerdict', () => {
  it('Distribution Wave: bearish > $500M across >= 3 events', () => {
    const events = [
      ev({ direction: 'Inflow', amountUsd: 200_000_000 }),
      ev({ direction: 'Sell Pressure', amountUsd: 200_000_000 }),
      ev({ direction: 'Resistance Wall', amountUsd: 150_000_000 }),
    ];
    const r = computeFlowVerdict(events);
    expect(r.verdict.label).toBe('Distribution Wave');
    expect(r.verdict.color).toBe('red');
  });

  it('Broad Accumulation: bullish > $500M across >= 3 events', () => {
    const events = [
      ev({ direction: 'Outflow', amountUsd: 200_000_000 }),
      ev({ direction: 'Buy Pressure', amountUsd: 200_000_000 }),
      ev({ direction: 'Smart Money', amountUsd: 150_000_000 }),
    ];
    const r = computeFlowVerdict(events);
    expect(r.verdict.label).toBe('Broad Accumulation');
    expect(r.verdict.color).toBe('green');
  });

  it('Liquidation Cascade Detected: liq_spike total > $300M (and no 3+ event bearish/bullish wave)', () => {
    const events = [
      ev({ type: 'liq_spike', direction: 'Sell Pressure', amountUsd: 350_000_000 }),
    ];
    const r = computeFlowVerdict(events);
    expect(r.verdict.label).toBe('Liquidation Cascade Detected');
    expect(r.verdict.color).toBe('amber');
    expect(r.statLine).toContain('$350M');
  });

  it('Mixed Flow: >= 3 bullish AND >= 3 bearish, below the $500M waves', () => {
    const events = [
      ev({ direction: 'Outflow', amountUsd: 10_000_000 }),
      ev({ direction: 'Buy Pressure', amountUsd: 10_000_000 }),
      ev({ direction: 'Accumulation', amountUsd: 10_000_000 }),
      ev({ direction: 'Inflow', amountUsd: 10_000_000 }),
      ev({ direction: 'Sell Pressure', amountUsd: 10_000_000 }),
      ev({ direction: 'Resistance Wall', amountUsd: 10_000_000 }),
    ];
    const r = computeFlowVerdict(events);
    expect(r.verdict.label).toBe('Mixed Flow');
  });

  it('Quiet Flow: fallback when nothing else matches', () => {
    const events = [ev({ direction: 'Inflow', amountUsd: 5_000_000 })];
    const r = computeFlowVerdict(events);
    expect(r.verdict.label).toBe('Quiet Flow');
    expect(r.verdict.color).toBe('grey');
  });

  it('Quiet Flow: empty events list', () => {
    const r = computeFlowVerdict([]);
    expect(r.verdict.label).toBe('Quiet Flow');
    expect(r.statLine).toBe('0 events tracked');
  });

  it('Distribution Wave takes priority over Liquidation Cascade when both thresholds are met', () => {
    const events = [
      ev({ type: 'liq_spike', direction: 'Sell Pressure', amountUsd: 350_000_000 }),
      ev({ direction: 'Inflow', amountUsd: 200_000_000 }),
      ev({ direction: 'Resistance Wall', amountUsd: 150_000_000 }),
    ];
    const r = computeFlowVerdict(events);
    expect(r.verdict.label).toBe('Distribution Wave');
  });
});
