/**
 * Live Console (Overview) payload.
 *
 * Market conditions (Fear&Greed, ETF 7d flow, on-chain bias, 24h liquidations)
 * and five regime chips (BTC/ETH/SOL/BNB/HYPE via the regime engine), plus a
 * Flow Radar preview. Calendar and Watchlist previews fetch their own
 * dedicated endpoints independently (/api/market/calendar,
 * /api/market/watchlist) rather than living in this payload — Watchlist in
 * particular must show the exact same fixed 5-asset roster as the standalone
 * Watchlist page, not a separately-computed pick, so it reads the same route.
 */

import type { ConsolePayload, Verdict } from '../contracts';
import { computeRegime, classifyFearGreed } from '../rules/regime';
import {
  fearGreed, etfFlow, globalLongShort, liqCoinList, liqAggHistory,
  fundingOiWeight, oiAggHistory, pairsMarkets,
} from './cg-endpoints';
import { btcDominance } from './coingecko';
import {
  primaryPair, ohlcToSeries, classifyDir, latestClose, nowIso, type Dir,
} from './helpers';
import { buildFlowEvents } from './flow';

function toRegime(label: string): 'Bullish' | 'Neutral' | 'Bearish' {
  if (label.includes('Bullish')) return 'Bullish';
  if (label.includes('Bearish')) return 'Bearish';
  return 'Neutral';
}

/**
 * Confidence floor for the per-asset chip regime. Below 0.60 a directional read
 * is little better than a coin-flip, so it degrades to Neutral.
 */
function floorRegime(regime: 'Bullish' | 'Neutral' | 'Bearish', conf: number): 'Bullish' | 'Neutral' | 'Bearish' {
  return conf < 0.6 ? 'Neutral' : regime;
}

/**
 * Global-regime display verdict with a confidence floor:
 *   < 0.60      → "Neutral · Low Signal"
 *   0.60–0.75   → "Leaning Bullish/Bearish"
 *   ≥ 0.75      → the full engine verdict (Strongly / Cautiously …)
 */
function floorGlobalVerdict(v: Verdict, conf: number): Verdict {
  const dir = v.label.includes('Bullish') ? 'Bullish' : v.label.includes('Bearish') ? 'Bearish' : 'Neutral';
  if (dir === 'Neutral') return { label: 'Neutral', color: 'grey' };
  if (conf < 0.6) return { label: 'Neutral · Low Signal', color: 'grey' };
  if (conf < 0.75) return { label: `Leaning ${dir}`, color: dir === 'Bullish' ? 'grey-green' : 'grey-red' };
  return v;
}

/** Full regime for a perp asset (BTC/ETH/SOL/BNB/HYPE). Long/Short bias is NOT
 *  part of this composite (dropped per the Kumami Plus cross-cutting fix) — it
 *  still drives the separate On-Chain Bias tile via its own fetch below. */
async function assetRegime(asset: string, etfScore: -1 | 0 | 1, fg: number) {
  const [pairs, funding, oi] = await Promise.all([
    pairsMarkets(asset).catch(() => []),
    fundingOiWeight(asset, '1h').catch(() => []),
    oiAggHistory(asset, '1h').catch(() => []),
  ]);
  const primary = primaryPair(pairs);
  // null (not 0) when the price fetch failed — a fetch failure must never render as "$0".
  const price = primary?.current_price ?? null;
  const change24h = primary?.price_change_percent_24h ?? null;
  const fundingPct = latestClose(funding) * 100;
  const oiDir: Dir = classifyDir(ohlcToSeries(oi, 24));
  const priceDir: Dir = change24h === null ? 'flat' : change24h > 0.5 ? 'up' : change24h < -0.5 ? 'down' : 'flat';
  const oiVsPriceScore: -1 | 0 | 1 =
    oiDir === 'up' && priceDir === 'up' ? 1 : oiDir === 'up' && priceDir === 'flat' ? -1 : 0;

  const r = computeRegime({
    fearGreed: fg,
    etfFlowScore: etfScore,
    fundingRate: fundingPct,
    oiVsPriceScore,
  });
  const conf = r.confidence;

  // #7 diagnostic — set MARKET_DEBUG=1 to log each asset's signal breakdown.
  if (process.env.MARKET_DEBUG === '1') {
    const c = r.components;
    console.log(
      `[regime] ${asset.padEnd(4)} | F&G ${fg}(${c.fearGreed >= 0 ? '+' : ''}${c.fearGreed})` +
        ` | Funding ${fundingPct.toFixed(3)}%(${c.funding >= 0 ? '+' : ''}${c.funding})` +
        ` | ETF(${c.etfFlow >= 0 ? '+' : ''}${c.etfFlow})` +
        ` | OIxPrice ${oiDir}/${priceDir}(${c.oiVsPrice >= 0 ? '+' : ''}${c.oiVsPrice})` +
        ` | Sum ${r.score} | Norm ${r.normalizedScore.toFixed(2)} | ${r.verdict.label} | Conf ${conf.toFixed(2)}`,
    );
  }

  return {
    asset,
    price: price !== null ? Number(price.toFixed(price >= 100 ? 2 : 4)) : null,
    change24h: change24h !== null ? Number(change24h.toFixed(2)) : null,
    regime: floorRegime(toRegime(r.verdict.label), conf),
    confidence: Number(conf.toFixed(2)),
    // Raw engine outputs — used to derive the Global Regime tile, not shown per-chip.
    verdict: r.verdict,
    rawConf: conf,
  };
}

export async function makeConsolePayloadLive(): Promise<ConsolePayload> {
  const [fg, btcEtf, ethEtf, glsBtc, liqCoin, liqAggBtc, flowEvents, dominance] = await Promise.all([
    fearGreed().catch(() => null),
    etfFlow('bitcoin').catch(() => null),
    etfFlow('ethereum').catch(() => null),
    globalLongShort('BTCUSDT', '1h').catch(() => null),
    liqCoinList().catch(() => null),
    liqAggHistory('BTC', '1h').catch(() => []),
    buildFlowEvents().catch(() => []),
    btcDominance().catch(() => null),
  ]);

  // fgValue feeds the regime-scoring composite below, so it needs a neutral
  // numeric default even on failure — but that default must NEVER reach the
  // UI as if it were a real reading, so fearGreed on the payload stays null.
  const fgValue = fg?.data_list?.length ? fg.data_list[fg.data_list.length - 1] : 50;
  const fgFailed = !fg?.data_list?.length;
  const fgClass = classifyFearGreed(fgValue);

  // ETF 7d flow + prev-7d comparison — null (not a fetch-empty 0) when the fetch failed.
  const last7 = btcEtf ? btcEtf.slice(-7) : [];
  const prev7 = btcEtf ? btcEtf.slice(-14, -7) : [];
  const etf7d = last7.reduce((a, b) => a + (b.flow_usd || 0), 0);
  const etfPrev = prev7.reduce((a, b) => a + (b.flow_usd || 0), 0);
  const etfPctVsPrev = etfPrev !== 0 ? ((etf7d - etfPrev) / Math.abs(etfPrev)) * 100 : 0;
  const btcEtfScore: -1 | 0 | 1 = etf7d > 0 ? 1 : etf7d < 0 ? -1 : 0;
  const ethEtf7d = ethEtf ? ethEtf.slice(-7).reduce((a, b) => a + (b.flow_usd || 0), 0) : 0;
  const ethEtfScore: -1 | 0 | 1 = ethEtf7d > 0 ? 1 : ethEtf7d < 0 ? -1 : 0;

  // On-chain bias — null when the long/short fetch failed, not a fake 50/50 split.
  const glsLatest = glsBtc?.length ? glsBtc[glsBtc.length - 1] : null;
  const pctLong = glsLatest?.global_account_long_percent ?? null;
  const ratio = glsLatest?.global_account_long_short_ratio ?? null;

  // 24h liquidations total + vs 7d avg — null when the fetch failed.
  const liqCoinFailed = liqCoin === null;
  const liq24hTotal = (liqCoin ?? []).reduce((a, b) => a + (b.liquidation_usd_24h || 0), 0);
  const aggPerHour = liqAggBtc.map((x) => (x.aggregated_long_liquidation_usd || 0) + (x.aggregated_short_liquidation_usd || 0));
  const last24 = aggPerHour.slice(-24).reduce((a, b) => a + b, 0);
  const totalAgg = aggPerHour.reduce((a, b) => a + b, 0);
  const windows = Math.max(1, aggPerHour.length / 24);
  const avgPer24 = totalAgg / windows;
  const liqPctVsAvg = avgPer24 > 0 ? ((last24 - avgPer24) / avgPer24) * 100 : 0;

  // Regime chips — BTC, ETH, SOL, BNB, HYPE (none of these have a spot-ETF, so
  // BNB/HYPE/SOL all pass etfScore 0, same as the existing SOL treatment).
  const [btc, eth, sol, bnb, hype] = await Promise.all([
    assetRegime('BTC', btcEtfScore, fgValue),
    assetRegime('ETH', ethEtfScore, fgValue),
    assetRegime('SOL', 0, fgValue),
    assetRegime('BNB', 0, fgValue),
    assetRegime('HYPE', 0, fgValue),
  ]);

  // Keep only the 5 contract fields per chip (drop the raw verdict/rawConf helpers).
  type Chip = ConsolePayload['regimeChips'][number];
  const chip = (x: typeof btc, asset: Chip['asset']): Chip => ({
    asset, price: x.price, change24h: x.change24h, regime: x.regime, confidence: x.confidence,
  });
  const regimeChips: ConsolePayload['regimeChips'] = [
    chip(btc, 'BTC'), chip(eth, 'ETH'), chip(sol, 'SOL'), chip(bnb, 'BNB'), chip(hype, 'HYPE'),
  ];

  // Global Regime = the regime engine's verdict (BTC as the market proxy), with a
  // confidence floor — NOT the Fear & Greed label (that stays on the sentiment bar).
  const globalVerdict = floorGlobalVerdict(btc.verdict, btc.rawConf);

  // Market-conditions tags — skip bias-derived tags entirely when the fetch failed.
  const tags: Verdict[] = [];
  if (pctLong !== null) {
    if (pctLong > 60) tags.push({ label: '· Longs Crowded', color: 'amber' });
    else if (pctLong < 40) tags.push({ label: '· Shorts Crowded', color: 'amber' });
  }
  if (!btcEtf) { /* no tag — flow direction unknown while the fetch is down */ }
  else if (etf7d > 0) tags.push({ label: '· ETF Inflows', color: 'grey-green' });
  else if (etf7d < 0) tags.push({ label: '· ETF Outflows', color: 'grey-red' });

  return {
    marketConditions: {
      verdict: globalVerdict,
      fearGreedLabel: fgClass.label,
      fearGreedColor: fgClass.color,
      tags: tags.slice(0, 2),
      confidence: btc.confidence,
      updatedAt: nowIso(),
      fearGreed: fgFailed ? null : fgValue,
      tiles: {
        etfFlow7d: btcEtf ? { usd: Math.round(etf7d), pctVsPrev: Number(etfPctVsPrev.toFixed(1)) } : null,
        btcDominance: dominance
          ? { pct: Number(dominance.pct.toFixed(1)), dayChange: Number(dominance.changePct24h.toFixed(2)) }
          : null,
        onChainBias: pctLong !== null && ratio !== null
          ? { pctLong: Number(pctLong.toFixed(1)), ratio: Number(ratio.toFixed(2)) }
          : null,
        liq24h: liqCoinFailed ? null : { totalUsd: Math.round(liq24hTotal), pctVsAvg7d: Number(liqPctVsAvg.toFixed(1)) },
      },
    },
    regimeChips,
    flowRadar: flowEvents.slice(0, 6),
  };
}
