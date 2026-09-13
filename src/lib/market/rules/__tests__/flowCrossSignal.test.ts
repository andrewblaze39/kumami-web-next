import { describe, it, expect } from 'vitest';
import { computeFlowCrossSignal } from '../flowCrossSignal';

describe('computeFlowCrossSignal', () => {
  it('tags a whale outflow during Fear as Regime shift confirming', () => {
    const r = computeFlowCrossSignal({ type: 'whale_transfer', direction: 'Outflow' }, 'Fear');
    expect(r).toEqual({ label: 'Regime shift confirming', color: 'green' });
  });

  it('tags a whale outflow during Extreme Fear the same way', () => {
    const r = computeFlowCrossSignal({ type: 'whale_transfer', direction: 'Outflow' }, 'Extreme Fear');
    expect(r?.label).toBe('Regime shift confirming');
  });

  it('does not tag when sentiment is not fear-leaning', () => {
    expect(computeFlowCrossSignal({ type: 'whale_transfer', direction: 'Outflow' }, 'Greed')).toBeUndefined();
    expect(computeFlowCrossSignal({ type: 'whale_transfer', direction: 'Outflow' }, 'Neutral')).toBeUndefined();
  });

  it('does not tag an inflow even during Fear', () => {
    expect(computeFlowCrossSignal({ type: 'whale_transfer', direction: 'Inflow' }, 'Fear')).toBeUndefined();
  });

  it('does not tag other event types', () => {
    expect(computeFlowCrossSignal({ type: 'liq_spike', direction: 'Sell Pressure' }, 'Fear')).toBeUndefined();
    expect(computeFlowCrossSignal({ type: 'smart_money', direction: 'Outflow' }, 'Fear')).toBeUndefined();
  });
});
