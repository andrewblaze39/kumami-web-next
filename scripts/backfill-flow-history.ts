/**
 * Backfill the last 7 days of Flow Radar history (Firestore `flow_daily`) so
 * Watchlist Pro's "consistent in Flow Radar for 7 days" picks and Spot Pulse
 * Pro's row 2 work immediately instead of after a week (Andrew, 10 Oct 2026).
 *
 *   npx tsx --conditions react-server scripts/backfill-flow-history.ts [--days 6] [--dry]
 *
 * Writes to the Firebase project in .env.local (FIREBASE_SERVICE_ACCOUNT_JSON) —
 * run it once per environment. Safe to re-run: tallies merge with a field-wise
 * max, exactly like live recording (rules/consistentFlow.mergeTallies).
 *
 * What can be rebuilt from CoinGlass history (same rules as live Flow Radar):
 *   ✅ whale transfers   — /api/chain/v2/whale-transfer with start_time/end_time
 *                          (≥ $5M with an exchange on one side; top 20 per day by USD,
 *                          like the live buffer's cap)
 *   ✅ liquidation spikes — hourly /api/futures/liquidation/aggregated-history for the
 *                          30 coins with the most liquidations (HIGH > $200M/h, MED $50–200M/h)
 *   ❌ smart money (Hyperliquid) — only the last few hours exist
 *   ❌ netflow flips — snapshot only
 * Backfilled days are marked `backfilled: true` (+ `backfilledSources`).
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd(), true, { info() {}, error: console.error } as never);

const args = process.argv.slice(2);
const DAYS = Number(args[args.indexOf('--days') + 1]) || 6; // days before today (today is recorded live)
const DRY = args.includes('--dry');
const LIQ_EXCHANGES = 'Binance,OKX,Bybit,Bitget,Gate,Hyperliquid,HTX,Bitmex,Deribit,CoinEx';

(async () => {
  const { cgFetch } = await import('../src/lib/market/coinglass/client');
  const { liqCoinList, liqAggHistory, type: _t } = (await import('../src/lib/market/live/cg-endpoints')) as typeof import('../src/lib/market/live/cg-endpoints') & { type?: never };
  void _t;
  const { isExchangeLabel } = await import('../src/lib/market/live/flow');
  const { computeFlowRadar } = await import('../src/lib/market/rules/flowRadar');
  const { tallyDay, mergeTallies, utcDay, STABLECOINS } = await import('../src/lib/market/rules/consistentFlow');
  const { adminDb } = await import('../src/lib/firebase-admin');
  type FlowEvent = import('../src/lib/market/contracts').FlowEvent;
  type WhaleRow = import('../src/lib/market/live/cg-endpoints').WhaleRow;

  const db = adminDb();
  const project = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '{}').project_id;
  console.log(`Backfilling ${DAYS} day(s) into project "${project}"${DRY ? ' (dry run)' : ''}`);

  // Coins for liquidation history: the 30 with the most 24h liquidations (no stablecoins).
  const liqCoins = (await liqCoinList())
    .filter((c) => !STABLECOINS.includes(c.symbol.toUpperCase()))
    .sort((a, b) => (b.liquidation_usd_24h ?? 0) - (a.liquidation_usd_24h ?? 0))
    .slice(0, 30)
    .map((c) => c.symbol);
  const liqHistory = new Map<string, { time: number; aggregated_long_liquidation_usd: number; aggregated_short_liquidation_usd: number }[]>();
  for (const sym of liqCoins) {
    // All major venues (live Flow Radar's coin-list figures are cross-exchange).
    liqHistory.set(sym, await liqAggHistory(sym, '1h', LIQ_EXCHANGES).catch(() => []));
  }

  const todayStart = Date.parse(`${utcDay(Date.now())}T00:00:00Z`);
  for (let i = DAYS; i >= 1; i--) {
    const start = todayStart - i * 86_400_000;
    const end = start + 86_400_000;
    const day = utcDay(start);
    const events: FlowEvent[] = [];

    // Whale transfers — in 6h chunks (the endpoint returns at most ~1000 rows per call).
    const whales: WhaleRow[] = [];
    for (let t = start; t < end; t += 6 * 3_600_000) {
      let rows: WhaleRow[] | null = null;
      for (let attempt = 0; attempt < 3 && rows === null; attempt++) {
        rows = await cgFetch<WhaleRow[]>('/api/chain/v2/whale-transfer', { start_time: t, end_time: Math.min(t + 6 * 3_600_000, end) })
          .catch((e) => { console.warn(`  ${utcDay(t)} chunk ${new Date(t).toISOString().slice(11, 16)} attempt ${attempt + 1} failed: ${(e as Error).message}`); return null; });
        if (rows === null) await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      }
      if (rows === null) console.warn(`  ${utcDay(t)} chunk ${new Date(t).toISOString().slice(11, 16)}: GAVE UP — day will be incomplete`);
      whales.push(...(rows ?? []));
      await new Promise((r) => setTimeout(r, 1500)); // pace calls — CoinGlass rate limits
    }
    const whaleEvents: FlowEvent[] = [];
    for (const w of whales) {
      const amountUsd = Number(w.amount_usd);
      if (!Number.isFinite(amountUsd) || amountUsd < 5_000_000) continue;
      const toEx = isExchangeLabel(w.to);
      const fromEx = isExchangeLabel(w.from);
      if (!toEx && !fromEx) continue;
      const r = computeFlowRadar({ type: 'whale_transfer', asset: w.asset_symbol, amountUsd, toExchange: toEx });
      const ms = w.block_timestamp < 1e12 ? w.block_timestamp * 1000 : w.block_timestamp;
      whaleEvents.push({ id: `bf-whale-${w.transaction_hash.slice(0, 12)}`, type: 'whale_transfer', asset: w.asset_symbol, amountUsd: Math.round(amountUsd), direction: r.direction, severity: r.severity, description: r.description, ts: new Date(ms).toISOString() });
    }
    // No top-N cap: the live buffer refreshes every minute, so over a day it sees
    // far more than any single snapshot's 20 — a whole-day cap would bias the
    // backfill to BTC/ETH/stablecoin moves and hide the alts we're looking for.
    events.push(...whaleEvents);

    // Liquidation spikes — every hour of the day per coin.
    let liqCount = 0;
    for (const [sym, rows] of liqHistory) {
      for (const r of rows) {
        const ms = r.time < 1e12 ? r.time * 1000 : r.time;
        if (ms < start || ms >= end) continue;
        const total = Number(r.aggregated_long_liquidation_usd ?? 0) + Number(r.aggregated_short_liquidation_usd ?? 0);
        if (total < 50_000_000) continue; // below MED — never counted
        const fr = computeFlowRadar({ type: 'liq_spike', asset: sym, amountUsd: total });
        events.push({ id: `bf-liq-${sym}-${ms}`, type: 'liq_spike', asset: sym, amountUsd: Math.round(total), direction: fr.direction, severity: fr.severity, description: fr.description, ts: new Date(ms).toISOString() });
        liqCount++;
      }
    }

    const fresh = tallyDay(events, day);
    const ref = db.collection('flow_daily').doc(day);
    const stored = (await ref.get()).data()?.assets;
    const merged = mergeTallies(stored, fresh);
    const coins = Object.keys(fresh);
    console.log(`${day}: ${whales.length} whale rows → ${whaleEvents.length} events, ${liqCount} liquidation spikes → ${coins.length} coins (${coins.slice(0, 10).join(', ')}${coins.length > 10 ? ', …' : ''})`);
    if (!DRY) {
      await ref.set({ date: day, assets: merged, backfilled: true, backfilledSources: ['whale_transfer', 'liq_spike'], backfilledAt: new Date().toISOString() }, { merge: true });
    }
  }
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error('backfill failed:', e); process.exit(1); });
