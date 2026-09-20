import { describe, it, expect } from 'vitest';
import { computeFlowBalance } from '../flowBalance';
import type { FlowEvent } from '../../contracts';

const ev = (direction: FlowEvent['direction'], amountUsd: number): FlowEvent => ({
  id: `${direction}-${amountUsd}`,
  type: 'whale_transfer',
  asset: 'BTC',
  amountUsd,
  direction,
  severity: 'HIGH',
  description: 'test',
  ts: new Date().toISOString(),
});

describe('computeFlowBalance', () => {
  it('sums bullish and bearish directions independently', () => {
    const r = computeFlowBalance([ev('Outflow', 100_000_000), ev('Inflow', 40_000_000)]);
    expect(r.bullishUsd).toBe(100_000_000);
    expect(r.bearishUsd).toBe(40_000_000);
    expect(r.netUsd).toBe(60_000_000);
  });

  it('ignores non-directional events (e.g. amounts on unrelated types) — ties resolve to 50/50 when empty', () => {
    const r = computeFlowBalance([]);
    expect(r.bullishPct).toBe(50);
    expect(r.bearishPct).toBe(50);
    expect(r.verdict).toBe('Balanced');
  });

  it('verdict bands: net > $500M → Strong Accumulation', () => {
    const r = computeFlowBalance([ev('Outflow', 600_000_000)]);
    expect(r.verdict).toBe('Strong Accumulation');
  });

  it('verdict bands: net $100M-$500M → Accumulation', () => {
    const r = computeFlowBalance([ev('Outflow', 200_000_000)]);
    expect(r.verdict).toBe('Accumulation');
  });

  it('verdict bands: net within ±$100M → Balanced', () => {
    const r = computeFlowBalance([ev('Outflow', 150_000_000), ev('Inflow', 100_000_000)]);
    expect(r.verdict).toBe('Balanced');
  });

  it('verdict bands: net -$100M to -$500M → Distribution', () => {
    const r = computeFlowBalance([ev('Inflow', 300_000_000)]);
    expect(r.verdict).toBe('Distribution');
  });

  it('verdict bands: net < -$500M → Heavy Distribution', () => {
    const r = computeFlowBalance([ev('Inflow', 600_000_000)]);
    expect(r.verdict).toBe('Heavy Distribution');
  });

  it('percentages sum to 100 and reflect the split', () => {
    const r = computeFlowBalance([ev('Outflow', 750_000_000), ev('Inflow', 250_000_000)]);
    expect(r.bullishPct + r.bearishPct).toBe(100);
    expect(r.bullishPct).toBe(75);
    expect(r.bearishPct).toBe(25);
  });
});
