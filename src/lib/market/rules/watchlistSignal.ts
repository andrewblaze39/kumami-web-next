/**
 * Watchlist's dedicated "Signal" column — separate from the Status action
 * tags (watchlistTags.ts). Surfaces the single most notable flow narrative
 * for an asset: a whale flow, smart-money confirmation, a Spot Pulse verdict,
 * or "Quiet" when nothing stands out. Priority (first match wins):
 *   1. Whale flow + smart money aligned same direction → "Multi-signal"
 *   2. Whale Accumulation / Distribution (2+ whale transfers, 24h)
 *   3. A notable Spot Pulse verdict for this asset
 *   4. "Quiet" — nothing fired
 *
 * All detail lines are computed from real numbers already in scope (whale
 * transfer USD totals, Spot Pulse's own price-change reading) — never a
 * fabricated figure.
 */

import type { Verdict } from '../contracts';

export type PrimarySignal = {
  /** Emoji marker, or '' for the no-signal case. */
  icon: string;
  label: string;
  detail: string;
  color: Verdict['color'];
};

export type PrimarySignalInputs = {
  whaleBullishCount: number;
  whaleBearishCount: number;
  whaleBullishUsd: number;
  whaleBearishUsd: number;
  smartMoneyBullishCount: number;
  smartMoneyBearishCount: number;
  /** Spot Pulse verdict label for this asset, e.g. "REAL BUYING", if available. */
  spotPulseVerdict?: string;
  /** Spot Pulse's own 4H price change for this asset — feeds the detail line. */
  spotPulsePriceChange4h?: number;
};

function formatUsdShort(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

const NOTABLE_SPOT_PULSE: Record<string, { icon: string; label: string; color: Verdict['color']; detail: (pct?: number) => string }> = {
  'REAL BUYING': { icon: '📈', label: 'Real Buying', color: 'green', detail: () => 'Spot leading — genuine demand' },
  'REVERSAL SETUP': {
    icon: '🌱', label: 'Reversal Setup', color: 'green',
    detail: (pct) => (pct !== undefined ? `Spot buying on ${pct.toFixed(1)}% dip` : 'Spot buying despite the dip'),
  },
  ACCUMULATION: { icon: '🟢', label: 'Accumulation', color: 'green', detail: () => 'Spot buying, price flat' },
  DISTRIBUTION: { icon: '🔻', label: 'Distribution', color: 'red', detail: () => 'Spot selling into strength' },
  SPECULATIVE: { icon: '⚡', label: 'Speculative', color: 'amber', detail: () => 'Futures leading, spot quiet' },
  'COHERENT DECLINE': { icon: '🔻', label: 'Declining', color: 'red', detail: () => 'Spot and futures both selling' },
  'FORCED DECLINE': { icon: '🔻', label: 'Declining', color: 'red', detail: () => 'Spot and futures both selling' },
};

export function computePrimarySignal(inputs: PrimarySignalInputs): PrimarySignal {
  const whaleBullish = inputs.whaleBullishCount >= 2;
  const whaleBearish = inputs.whaleBearishCount >= 2;
  const smartBullish = inputs.smartMoneyBullishCount >= 1;
  const smartBearish = inputs.smartMoneyBearishCount >= 1;

  if (whaleBullish && smartBullish) {
    return { icon: '🔥', label: 'Multi-signal', detail: 'Whale + smart money · 24h', color: 'green' };
  }
  if (whaleBearish && smartBearish) {
    return { icon: '🔥', label: 'Multi-signal', detail: 'Whale + smart money · 24h', color: 'red' };
  }
  if (whaleBullish) {
    return { icon: '🐋', label: 'Whale Accumulation', detail: `${formatUsdShort(inputs.whaleBullishUsd)} outflow · 24h`, color: 'green' };
  }
  if (whaleBearish) {
    return { icon: '🐋', label: 'Whale Distribution', detail: `${formatUsdShort(inputs.whaleBearishUsd)} inflow · 24h`, color: 'red' };
  }
  if (inputs.spotPulseVerdict) {
    const notable = NOTABLE_SPOT_PULSE[inputs.spotPulseVerdict];
    if (notable) {
      return { icon: notable.icon, label: notable.label, detail: notable.detail(inputs.spotPulsePriceChange4h), color: notable.color };
    }
  }
  return { icon: '', label: 'Quiet', detail: 'No major signals in 24h', color: 'grey' };
}
