/**
 * Live Flow Radar event assembly — Rachelle v1.15 Plus §3 (shared by Plus and Pro).
 *
 *   whale_transfer ← /api/chain/v2/whale-transfer            deposits/withdrawals only, unique by tx hash
 *   exchange_flow  ← /api/exchange/chain/tx/list (USDT, USDC) "Dry Powder": net per exchange, last 60 min
 *   liq_spike      ← /api/futures/liquidation/coin-list × 5 exchanges, 1h summed per coin
 *   smart_money    ← /api/hyperliquid/whale-alert            opens (long/short) and closes (neutral)
 *   netflow_flip   ← /api/futures/netflow-list               (Pro) 5m vs 30m sign flip — unchanged
 *
 * One event per coin per hour for liquidations and per exchange+token per hour for
 * Dry Powder (the id carries the hour, so a refresh updates it instead of adding a row).
 * Without a background collector the hourly value is the latest reading, not the peak.
 */

import type { FlowEvent } from '../contracts';
import { computeFlowRadar, hyperliquidAsset } from '../rules/flowRadar';
import {
  whaleTransfers,
  netflowList,
  liqCoinListFor,
  exchangeChainTx,
  hyperliquidWhales,
  type ExchangeChainTxRow,
  type LiqCoinRow,
} from './cg-endpoints';
import { tsToIso } from './helpers';

const EXCHANGE_HINTS = [
  'binance', 'coinbase', 'okx', 'kraken', 'bybit', 'kucoin', 'bitfinex', 'huobi', 'htx',
  'gate', 'bitget', 'upbit', 'mexc', 'exchange', 'crypto.com', 'robinhood', 'gemini',
  'bitstamp', 'bithumb', 'deribit', 'bitmex', 'bingx', 'whitebit', 'poloniex',
];

export function isExchangeLabel(label: string | undefined): boolean {
  if (!label) return false;
  const l = label.toLowerCase();
  return EXCHANGE_HINTS.some((h) => l.includes(h));
}

/** The 5 venues summed for liquidations (v1.15 Plus §3 event 3). */
export const LIQ_EXCHANGES = ['Binance', 'OKX', 'Bybit', 'Bitget', 'Hyperliquid'];
export const DRY_POWDER_TOKENS = ['USDT', 'USDC'];

const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
const hourKey = (now: number) => new Date(now).toISOString().slice(0, 13); // e.g. 2026-10-20T08

/** Whale transfer → deposit (true), withdrawal (false), or null when it isn't one
 *  (exchange ↔ exchange or wallet ↔ wallet says nothing about direction). */
export function whaleDirection(from: string | undefined, to: string | undefined): boolean | null {
  const toEx = isExchangeLabel(to);
  const fromEx = isExchangeLabel(from);
  if (toEx === fromEx) return null;
  return toEx;
}

/** Sum each coin's last-hour liquidations across exchanges. */
export function sumLiquidations(lists: (LiqCoinRow[] | null)[]): Map<string, { total: number; longs: number }> {
  const out = new Map<string, { total: number; longs: number }>();
  for (const list of lists) {
    for (const r of list ?? []) {
      const total = Number(r.liquidation_usd_1h ?? 0);
      if (!(total > 0)) continue;
      const cur = out.get(r.symbol) ?? { total: 0, longs: 0 };
      cur.total += total;
      cur.longs += Number(r.long_liquidation_usd_1h ?? 0);
      out.set(r.symbol, cur);
    }
  }
  return out;
}

/** Net stablecoin flow per exchange over the last 60 min. */
export function netByExchange(rows: ExchangeChainTxRow[], now: number): Map<string, { into: number; out: number }> {
  const out = new Map<string, { into: number; out: number }>();
  const since = now - 3_600_000;
  for (const r of rows) {
    if (r.transaction_time * 1000 < since) continue;
    const cur = out.get(r.exchange_name) ?? { into: 0, out: 0 };
    if (r.transfer_type === 1) cur.into += Number(r.amount_usd) || 0;
    else if (r.transfer_type === 2) cur.out += Number(r.amount_usd) || 0;
    out.set(r.exchange_name, cur);
  }
  return out;
}

export async function buildFlowEvents(now: number = Date.now()): Promise<FlowEvent[]> {
  // null (not []) distinguishes "this source's fetch failed" from "it genuinely
  // returned no rows" — if every source fails, the result must be an error, not a
  // fake quiet market. Single-source failures degrade to fewer event types.
  const [whalesRaw, netflowRaw, hlRaw, liqLists, txLists] = await Promise.all([
    whaleTransfers().catch(() => null as Awaited<ReturnType<typeof whaleTransfers>> | null),
    netflowList('futures').catch(() => null as Awaited<ReturnType<typeof netflowList>> | null),
    hyperliquidWhales().catch(() => null as Awaited<ReturnType<typeof hyperliquidWhales>> | null),
    Promise.all(LIQ_EXCHANGES.map((ex) => liqCoinListFor(ex).catch(() => null as LiqCoinRow[] | null))),
    Promise.all(DRY_POWDER_TOKENS.map((t) => exchangeChainTx(t).catch(() => null as ExchangeChainTxRow[] | null))),
  ]);
  const liqsFailed = liqLists.every((l) => l === null);
  const txFailed = txLists.every((l) => l === null);

  if (whalesRaw === null && netflowRaw === null && hlRaw === null && liqsFailed && txFailed) {
    throw new Error('Flow Radar data unavailable — all sources failed');
  }

  const whales = whalesRaw ?? [];
  const netflow = netflowRaw ?? [];
  const hl = hlRaw ?? [];
  const hour = hourKey(now);
  const nowIso = new Date(now).toISOString();

  const events: FlowEvent[] = [];

  // --- 1. whale transfers: deposits / withdrawals only ---------------------
  const seenTx = new Set<string>();
  for (const w of whales) {
    if (seenTx.has(w.transaction_hash)) continue;
    const amountUsd = Number(w.amount_usd);
    if (!Number.isFinite(amountUsd)) continue;
    const toExchange = whaleDirection(w.from, w.to);
    if (toExchange === null) continue;
    const r = computeFlowRadar({ type: 'whale_transfer', asset: w.asset_symbol, amountUsd, toExchange });
    if (!r) continue;
    seenTx.add(w.transaction_hash);
    events.push({
      id: `whale-${w.transaction_hash}`,
      type: 'whale_transfer',
      asset: w.asset_symbol,
      amountUsd: Math.round(amountUsd),
      direction: r.direction,
      severity: r.severity,
      description: r.description,
      ts: tsToIso(w.block_timestamp),
    });
    if (seenTx.size >= 40) break;
  }

  // --- 2. Dry Powder: net USDT/USDC per exchange over the last hour ---------
  DRY_POWDER_TOKENS.forEach((token, i) => {
    for (const [exchange, { into, out }] of netByExchange(txLists[i] ?? [], now)) {
      const net = into - out;
      const r = computeFlowRadar({ type: 'exchange_flow', asset: token, amountUsd: Math.abs(net), netIntoExchanges: net > 0, exchange });
      if (!r) continue;
      events.push({
        id: `drypowder-${exchange}-${token}-${hour}`,
        type: 'exchange_flow',
        asset: token,
        amountUsd: Math.round(Math.abs(net)),
        direction: r.direction,
        severity: r.severity,
        description: r.description,
        ts: nowIso,
        marketWide: true,
      });
    }
  });

  // --- 5. netflow flips (Pro; 5m vs 30m opposite sign, ranked by 1h magnitude)
  const flips = netflow
    .filter((n) => sign(n.net_flow_usd_5m) !== 0 && sign(n.net_flow_usd_5m) !== sign(n.net_flow_usd_30m))
    .sort((a, b) => Math.abs(b.net_flow_usd_1h) - Math.abs(a.net_flow_usd_1h))
    .slice(0, 12);
  for (const n of flips) {
    const flippedPositive = n.net_flow_usd_5m > 0;
    const amountUsd = Math.abs(n.net_flow_usd_1h);
    const r = computeFlowRadar({ type: 'netflow_flip', asset: n.symbol, amountUsd, flippedPositive });
    if (!r) continue;
    events.push({
      id: `netflow-${n.symbol}`,
      type: 'netflow_flip',
      asset: n.symbol,
      amountUsd: Math.round(amountUsd),
      direction: r.direction,
      severity: r.severity,
      description: r.description,
      ts: nowIso,
    });
  }

  // --- 3. liquidation spikes: 1h, summed over 5 exchanges -----------------
  const liqs = [...sumLiquidations(liqLists)].sort((x, y) => y[1].total - x[1].total).slice(0, 30);
  for (const [symbol, { total, longs }] of liqs) {
    const longShare = total > 0 ? Math.min(1, longs / total) : 0.5;
    const r = computeFlowRadar({ type: 'liq_spike', asset: symbol, amountUsd: total, longShare });
    if (!r) continue;
    events.push({
      id: `liq-${symbol}-${hour}`,
      type: 'liq_spike',
      asset: symbol,
      amountUsd: Math.round(total),
      direction: r.direction,
      severity: r.severity,
      description: r.description,
      ts: nowIso,
      longShare: Number(longShare.toFixed(3)),
    });
  }

  // --- 4. Hyperliquid smart money: opens and closes ----------------------
  const seenHl = new Set<string>();
  for (const p of [...hl].sort((x, y) => y.position_value_usd - x.position_value_usd)) {
    const isLong = p.position_size > 0;
    const closed = p.position_action === 2;
    const asset = hyperliquidAsset(p.symbol);
    const r = computeFlowRadar({ type: 'smart_money', asset, amountUsd: p.position_value_usd, isLong, closed });
    if (!r) continue;
    const id = `hl-${p.user.slice(0, 10)}-${p.symbol}-${p.create_time}`;
    if (seenHl.has(id)) continue;
    seenHl.add(id);
    events.push({
      id,
      type: 'smart_money',
      asset,
      amountUsd: Math.round(p.position_value_usd),
      direction: r.direction,
      severity: r.severity,
      description: r.description,
      ts: tsToIso(p.create_time),
      side: isLong ? 'long' : 'short',
      ...(p.position_action === 1 ? { action: 'open' as const } : closed ? { action: 'close' as const } : {}),
    });
    if (seenHl.size >= 40) break;
  }

  // Most recent first.
  events.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  return events;
}
