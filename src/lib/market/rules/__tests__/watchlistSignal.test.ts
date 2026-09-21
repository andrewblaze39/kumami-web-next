import { describe, it, expect } from 'vitest';
import { computePrimarySignal } from '../watchlistSignal';

const base = {
  whaleBullishCount: 0,
  whaleBearishCount: 0,
  whaleBullishUsd: 0,
  whaleBearishUsd: 0,
  smartMoneyBullishCount: 0,
  smartMoneyBearishCount: 0,
};

describe('computePrimarySignal', () => {
  it('falls back to Quiet when nothing fired', () => {
    const s = computePrimarySignal(base);
    expect(s).toEqual({ icon: '', label: 'Quiet', detail: 'No major signals in 24h', color: 'grey' });
  });

  it('Whale Accumulation with a real USD detail line', () => {
    const s = computePrimarySignal({ ...base, whaleBullishCount: 2, whaleBullishUsd: 340_000_000 });
    expect(s.label).toBe('Whale Accumulation');
    expect(s.detail).toBe('$340M outflow · 24h');
    expect(s.color).toBe('green');
  });

  it('Whale Distribution with a real USD detail line', () => {
    const s = computePrimarySignal({ ...base, whaleBearishCount: 3, whaleBearishUsd: 67_000_000 });
    expect(s.label).toBe('Whale Distribution');
    expect(s.detail).toBe('$67M inflow · 24h');
    expect(s.color).toBe('red');
  });

  it('Multi-signal when whale and smart money align bullish', () => {
    const s = computePrimarySignal({
      ...base, whaleBullishCount: 2, whaleBullishUsd: 12_000_000, smartMoneyBullishCount: 1,
    });
    expect(s.label).toBe('Multi-signal');
    expect(s.color).toBe('green');
  });

  it('Multi-signal when whale and smart money align bearish', () => {
    const s = computePrimarySignal({
      ...base, whaleBearishCount: 2, whaleBearishUsd: 5_000_000, smartMoneyBearishCount: 2,
    });
    expect(s.label).toBe('Multi-signal');
    expect(s.color).toBe('red');
  });

  it('falls back to Spot Pulse verdict when no whale signal', () => {
    const s = computePrimarySignal({ ...base, spotPulseVerdict: 'REVERSAL SETUP', spotPulsePriceChange4h: -3.2 });
    expect(s.label).toBe('Reversal Setup');
    expect(s.detail).toBe('Spot buying on -3.2% dip');
  });

  it('ignores an unlisted/BALANCED Spot Pulse verdict and falls to Quiet', () => {
    const s = computePrimarySignal({ ...base, spotPulseVerdict: 'BALANCED' });
    expect(s.label).toBe('Quiet');
  });

  it('whale signal takes priority over a Spot Pulse verdict', () => {
    const s = computePrimarySignal({
      ...base, whaleBullishCount: 2, whaleBullishUsd: 1_000_000, spotPulseVerdict: 'REAL BUYING',
    });
    expect(s.label).toBe('Whale Accumulation');
  });
});
