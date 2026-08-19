/**
 * Live Flow Radar event assembly.
 *
 * Merges four live CoinGlass feeds into the FlowEvent contract, classifying
 * each through the flowRadar rule engine:
 *   whale_transfer ← /api/chain/v2/whale-transfer
 *   netflow_flip   ← /api/futures/netflow-list        (5m vs 30m sign flip)
 *   liq_spike      ← /api/futures/liquidation/coin-list (1h liquidation burst)
 *   smart_money    ← /api/hyperliquid/whale-alert       (large HL positions)
 *
 * Tier-locked feeds (whale_wall / large-limit-order) are omitted — the four
 * live feeds already give a rich radar.
 */

import type { FlowEvent } from '../contracts';
import { computeFlowRadar } from '../rules/flowRadar';
import {
  whaleTransfers,
  netflowList,
  liqCoinList,
  hyperliquidWhales,
  type LiqCoinRow,
} from './cg-endpoints';
import { tsToIso } from './helpers';

const EXCHANGE_HINTS = [
  'binance', 'coinbase', 'okx', 'kraken', 'bybit', 'kucoin', 'bitfinex',
  'huobi', 'htx', 'gate', 'bitget', 'upbit', 'mexc', 'exchange', 'crypto.com',
];

function isExchangeLabel(label: string | undefined): boolean {
  if (!label) return false;
  const l = label.toLowerCase();
  return EXCHANGE_HINTS.some((h) => l.includes(h));
}

const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

export async function buildFlowEvents(): Promise<FlowEvent[]> {
  const [whales, netflow, liqs, hl] = await Promise.all([
    whaleTransfers().catch(() => [] as Awaited<ReturnType<typeof whaleTransfers>>),
    netflowList('futures').catch(() => [] as Awaited<ReturnType<typeof netflowList>>),
    liqCoinList().catch(() => [] as Awaited<ReturnType<typeof liqCoinList>>),
    hyperliquidWhales().catch(() => [] as Awaited<ReturnType<typeof hyperliquidWhales>>),
  ]);

  const events: FlowEvent[] = [];

  // --- whale transfers (top by USD) ---------------------------------------
  for (const w of whales.slice(0, 40)) {
    const amountUsd = Number(w.amount_usd);
    if (!Number.isFinite(amountUsd) || amountUsd < 5_000_000) continue;
    const toEx = isExchangeLabel(w.to);
    const fromEx = isExchangeLabel(w.from);
    // Only classify as inflow/outflow when one side is a known exchange.
    if (!toEx && !fromEx) continue;
    const r = computeFlowRadar({ type: 'whale_transfer', asset: w.asset_symbol, amountUsd, toExchange: toEx });
    events.push({
      id: `whale-${w.transaction_hash.slice(0, 12)}`,
      type: 'whale_transfer',
      asset: w.asset_symbol,
      amountUsd: Math.round(amountUsd),
      direction: r.direction,
      severity: r.severity,
      description: r.description,
      ts: tsToIso(w.block_timestamp),
    });
    if (events.filter((e) => e.type === 'whale_transfer').length >= 8) break;
  }

  // --- netflow flips (5m vs 30m opposite sign, ranked by 1h magnitude) -----
  const flips = netflow
    .filter((n) => sign(n.net_flow_usd_5m) !== 0 && sign(n.net_flow_usd_5m) !== sign(n.net_flow_usd_30m))
    .sort((a, b) => Math.abs(b.net_flow_usd_1h) - Math.abs(a.net_flow_usd_1h))
    .slice(0, 4);
  for (const n of flips) {
    const flippedPositive = n.net_flow_usd_5m > 0;
    const amountUsd = Math.abs(n.net_flow_usd_1h);
    const r = computeFlowRadar({ type: 'netflow_flip', asset: n.symbol, amountUsd, flippedPositive });
    events.push({
      id: `netflow-${n.symbol}`,
      type: 'netflow_flip',
      asset: n.symbol,
      amountUsd: Math.round(amountUsd),
      direction: r.direction,
      severity: r.severity,
      description: r.description,
      ts: new Date().toISOString(),
    });
  }

  // --- liquidation spikes (top by 1h liquidations) ------------------------
  const bySpike = [...liqs]
    .map((l) => ({ l, spike: Number((l as LiqCoinRow & { liquidation_usd_1h?: number }).liquidation_usd_1h ?? 0) }))
    .filter((x) => x.spike > 1_000_000)
    .sort((a, b) => b.spike - a.spike)
    .slice(0, 4);
  for (const { l, spike } of bySpike) {
    const r = computeFlowRadar({ type: 'liq_spike', asset: l.symbol, amountUsd: spike });
    events.push({
      id: `liq-${l.symbol}`,
      type: 'liq_spike',
      asset: l.symbol,
      amountUsd: Math.round(spike),
      direction: r.direction,
      severity: r.severity,
      description: r.description,
      ts: new Date().toISOString(),
    });
  }

  // --- Hyperliquid smart-money positions (top by USD) ---------------------
  for (const p of [...hl].sort((a, b) => b.position_value_usd - a.position_value_usd).slice(0, 4)) {
    const isLong = p.position_size > 0;
    const r = computeFlowRadar({ type: 'smart_money', asset: p.symbol, amountUsd: p.position_value_usd, isLong });
    events.push({
      id: `hl-${p.user.slice(0, 10)}-${p.symbol}`,
      type: 'smart_money',
      asset: p.symbol,
      amountUsd: Math.round(p.position_value_usd),
      direction: r.direction,
      severity: r.severity,
      description: r.description,
      ts: tsToIso(p.create_time),
    });
  }

  // Most recent first.
  events.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  return events;
}
