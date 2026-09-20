import { describe, it, expect } from 'vitest';
import { computeFlowCrossSignal } from '../flowCrossSignal';

describe('computeFlowCrossSignal', () => {
  it('rule 1: whale outflow + Spot Pulse REAL BUYING → Spot Pulse confirming (green)', () => {
    const r = computeFlowCrossSignal(
      { type: 'whale_transfer', direction: 'Outflow', asset: 'BTC' },
      { spotPulseVerdictByAsset: { BTC: 'REAL BUYING' } },
    );
    expect(r).toEqual({ label: 'Spot Pulse confirming', color: 'green' });
  });

  it('rule 1: also fires on ACCUMULATION verdict', () => {
    const r = computeFlowCrossSignal(
      { type: 'whale_transfer', direction: 'Outflow', asset: 'ETH' },
      { spotPulseVerdictByAsset: { ETH: 'ACCUMULATION' } },
    );
    expect(r?.label).toBe('Spot Pulse confirming');
  });

  it('rule 1: does not fire on a bearish Spot Pulse verdict', () => {
    const r = computeFlowCrossSignal(
      { type: 'whale_transfer', direction: 'Outflow', asset: 'BTC' },
      { spotPulseVerdictByAsset: { BTC: 'DISTRIBUTION' } },
    );
    expect(r).toBeUndefined();
  });

  it('rule 1: does not fire on an inflow even with a bullish Spot Pulse verdict', () => {
    const r = computeFlowCrossSignal(
      { type: 'whale_transfer', direction: 'Inflow', asset: 'BTC' },
      { spotPulseVerdictByAsset: { BTC: 'REAL BUYING' } },
    );
    expect(r).toBeUndefined();
  });

  it('rule 2: liq_spike + Bearish Console regime → Regime confirming (red)', () => {
    const r = computeFlowCrossSignal(
      { type: 'liq_spike', direction: 'Sell Pressure', asset: 'SOL' },
      { consoleRegimeByAsset: { SOL: 'Bearish' } },
    );
    expect(r).toEqual({ label: 'Regime confirming', color: 'red' });
  });

  it('rule 2: does not fire when Console regime is not Bearish', () => {
    const r = computeFlowCrossSignal(
      { type: 'liq_spike', direction: 'Sell Pressure', asset: 'SOL' },
      { consoleRegimeByAsset: { SOL: 'Neutral' } },
    );
    expect(r).toBeUndefined();
  });

  it('rule 3: smart_money + Watchlist Whale Accumulation tag → Watchlist confirming (green)', () => {
    const r = computeFlowCrossSignal(
      { type: 'smart_money', direction: 'Smart Money', asset: 'BNB' },
      { watchlistTagsByAsset: { BNB: ['Whale Accumulation'] } },
    );
    expect(r).toEqual({ label: 'Watchlist confirming', color: 'green' });
  });

  it('rule 3: does not fire without the Whale Accumulation tag', () => {
    const r = computeFlowCrossSignal(
      { type: 'smart_money', direction: 'Smart Money', asset: 'BNB' },
      { watchlistTagsByAsset: { BNB: ['Overheated'] } },
    );
    expect(r).toBeUndefined();
  });

  it('fallback: whale outflow during Fear → Regime shift confirming when no other rule fires', () => {
    const r = computeFlowCrossSignal(
      { type: 'whale_transfer', direction: 'Outflow', asset: 'BTC' },
      { fearGreedLabel: 'Fear' },
    );
    expect(r).toEqual({ label: 'Regime shift confirming', color: 'green' });
  });

  it('fallback: Extreme Fear also qualifies', () => {
    const r = computeFlowCrossSignal(
      { type: 'whale_transfer', direction: 'Outflow', asset: 'BTC' },
      { fearGreedLabel: 'Extreme Fear' },
    );
    expect(r?.label).toBe('Regime shift confirming');
  });

  it('fallback: does not fire when sentiment is not fear-leaning', () => {
    expect(computeFlowCrossSignal({ type: 'whale_transfer', direction: 'Outflow', asset: 'BTC' }, { fearGreedLabel: 'Greed' })).toBeUndefined();
    expect(computeFlowCrossSignal({ type: 'whale_transfer', direction: 'Outflow', asset: 'BTC' }, { fearGreedLabel: 'Neutral' })).toBeUndefined();
  });

  it('rule 1 takes priority over the Fear & Greed fallback when both would fire', () => {
    const r = computeFlowCrossSignal(
      { type: 'whale_transfer', direction: 'Outflow', asset: 'BTC' },
      { spotPulseVerdictByAsset: { BTC: 'REAL BUYING' }, fearGreedLabel: 'Fear' },
    );
    expect(r?.label).toBe('Spot Pulse confirming');
  });

  it('no context at all → undefined', () => {
    expect(computeFlowCrossSignal({ type: 'whale_transfer', direction: 'Outflow', asset: 'BTC' }, {})).toBeUndefined();
    expect(computeFlowCrossSignal({ type: 'liq_spike', direction: 'Sell Pressure', asset: 'BTC' }, {})).toBeUndefined();
    expect(computeFlowCrossSignal({ type: 'smart_money', direction: 'Smart Money', asset: 'BTC' }, {})).toBeUndefined();
  });
});
