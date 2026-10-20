import { describe, it, expect } from 'vitest';
import { computeFlowCrossSignal, type FlowCrossSignalContext } from '../flowCrossSignal';
import type { FlowEvent } from '../../contracts';

// Rachelle v1.15 Plus §3 cross-signal outlines (Plus and Pro).
const e = (type: FlowEvent['type'], direction: FlowEvent['direction'], asset = 'BTC') => ({ type, direction, asset });

describe('computeFlowCrossSignal', () => {
  it('rule 1: whale outflow + Spot Pulse REAL BUYING/ACCUMULATION → green', () => {
    for (const v of ['REAL BUYING', 'ACCUMULATION']) {
      expect(computeFlowCrossSignal(e('whale_transfer', 'Outflow'), { spotPulseVerdictByAsset: { BTC: v } }))
        .toEqual({ label: 'Spot Pulse confirming', color: 'green' });
    }
    expect(computeFlowCrossSignal(e('whale_transfer', 'Outflow'), { spotPulseVerdictByAsset: { BTC: 'SPECULATIVE' } })).toBeUndefined();
    expect(computeFlowCrossSignal(e('whale_transfer', 'Inflow'), { spotPulseVerdictByAsset: { BTC: 'REAL BUYING' } })).toBeUndefined();
  });

  it('rule 2: Long Flush + Bearish → red; Short Squeeze + Bullish → green (bullish mirror)', () => {
    const ctx: FlowCrossSignalContext = { consoleRegimeByAsset: { BTC: 'Bearish', ETH: 'Bullish' } };
    expect(computeFlowCrossSignal(e('liq_spike', 'Long Flush'), ctx)).toEqual({ label: 'Regime confirming', color: 'red' });
    expect(computeFlowCrossSignal(e('liq_spike', 'Short Squeeze', 'ETH'), ctx)).toEqual({ label: 'Regime confirming', color: 'green' });
    expect(computeFlowCrossSignal(e('liq_spike', 'Short Squeeze'), ctx)).toBeUndefined();
    expect(computeFlowCrossSignal(e('liq_spike', 'Two-sided Flush'), ctx)).toBeUndefined();
  });

  it('rule 3: Long Opened + ≥ 2 bullish whale events → green; Short Opened + ≥ 2 bearish → red', () => {
    const ctx: FlowCrossSignalContext = { whaleCounts24hByAsset: { BTC: { bullish: 2, bearish: 0 }, SOL: { bullish: 0, bearish: 3 } } };
    expect(computeFlowCrossSignal(e('smart_money', 'Long Opened'), ctx)).toEqual({ label: 'Watchlist confirming', color: 'green' });
    expect(computeFlowCrossSignal(e('smart_money', 'Short Opened', 'SOL'), ctx)).toEqual({ label: 'Watchlist confirming', color: 'red' });
    expect(computeFlowCrossSignal(e('smart_money', 'Short Opened'), ctx)).toBeUndefined();
    expect(computeFlowCrossSignal(e('smart_money', 'Position Closed'), ctx)).toBeUndefined();
    expect(computeFlowCrossSignal(e('smart_money', 'Long Opened'), { whaleCounts24hByAsset: { BTC: { bullish: 1, bearish: 0 } } })).toBeUndefined();
  });

  it('rule 4 fallback: whale outflow + Fear / Extreme Fear', () => {
    expect(computeFlowCrossSignal(e('whale_transfer', 'Outflow'), { fearGreedLabel: 'Extreme Fear' }))
      .toEqual({ label: 'Regime shift confirming', color: 'green' });
    expect(computeFlowCrossSignal(e('whale_transfer', 'Outflow'), { fearGreedLabel: 'Greed' })).toBeUndefined();
  });

  it('rule 1 wins over the fallback', () => {
    expect(computeFlowCrossSignal(e('whale_transfer', 'Outflow'), { spotPulseVerdictByAsset: { BTC: 'REAL BUYING' }, fearGreedLabel: 'Fear' })?.label)
      .toBe('Spot Pulse confirming');
  });
});
