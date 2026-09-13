/**
 * Flow Radar cross-signal amplification (Pro tier only — Kumami Pro §4.7a).
 *
 * Plus already ships 3 cross-signal checks inline in the market-verdict layer.
 * This file adds the Pro-only checks that need tools Plus doesn't have:
 *
 *   Whale Transfer OUTFLOW + Fear & Greed composite trending toward Fear
 *     → "Regime shift confirming" (green) — a contrarian accumulation signal:
 *       whales pulling off exchanges while the crowd is fearful.
 *
 * Two other Pro-only checks from the doc are NOT implemented here — both are
 * blocked on data we don't have:
 *   - Liquidation Spike + Heatmap cluster proximity: needs
 *     /api/futures/liquidation/aggregated-heatmap/model1, tier-locked on the
 *     current CoinGlass key.
 *   - Degen Sniper cluster detection: needs a Solana-native wallet-tagging
 *     source (Birdeye/Helius/Moralis) — no key configured.
 *
 * "Trending toward Fear" is read as a snapshot (composite label is Fear or
 * Extreme Fear right now), not a computed delta — the doc doesn't specify a
 * trend window, and computing one would mean storing composite history
 * ourselves. Documented simplification, same pattern as other rule engines
 * in this codebase when the spec is ambiguous.
 */

import type { FlowEvent } from '../contracts';

const FEAR_LABELS = new Set(['Fear', 'Extreme Fear']);

export function computeFlowCrossSignal(
  event: Pick<FlowEvent, 'type' | 'direction'>,
  fearGreedLabel: string,
): FlowEvent['crossSignal'] {
  if (event.type === 'whale_transfer' && event.direction === 'Outflow' && FEAR_LABELS.has(fearGreedLabel)) {
    return { label: 'Regime shift confirming', color: 'green' };
  }
  return undefined;
}
