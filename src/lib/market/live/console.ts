/**
 * Live Console (Overview) payload.
 *
 * Market conditions (Fear&Greed, ETF 7d flow, on-chain bias, 24h liquidations),
 * five regime chips (BTC/ETH/SOL via the regime engine, GOLD via XAUT perp,
 * SPX = coming-soon), plus previews of Flow Radar, Intelligence and the
 * auto-scored Radar Watchlist.
 */

import type { ConsolePayload, Verdict } from '../contracts';
import { computeRegime, classifyFearGreed } from '../rules/regime';
import { computeRadarWatchlist } from '../rules/radarWatchlist';
import {
  fearGreed, etfFlow, globalLongShort, liqCoinList, liqAggHistory,
  fundingOiWeight, oiAggHistory, pairsMarkets,
} from './cg-endpoints';
import {
  primaryPair, pairSymbol, ohlcToSeries, classifyDir, latestClose, nowIso, type Dir,
} from './helpers';
import { buildFlowEvents } from './flow';
import { makeIntelligencePayloadLive } from './intel';

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

/** Full regime for a perp asset (BTC/ETH/SOL). */
async function assetRegime(asset: string, etfScore: -1 | 0 | 1, fg: number) {
  const pair = pairSymbol(asset);
  const [pairs, gls, funding, oi] = await Promise.all([
    pairsMarkets(asset).catch(() => []),
    globalLongShort(pair, '1h').catch(() => []),
    fundingOiWeight(asset, '1h').catch(() => []),
    oiAggHistory(asset, '1h').catch(() => []),
  ]);
  const primary = primaryPair(pairs);
  const price = primary?.current_price ?? 0;
  const change24h = primary?.price_change_percent_24h ?? 0;
  const pctLong = gls.length ? gls[gls.length - 1].global_account_long_percent : 50;
  const fundingPct = latestClose(funding) * 100;
  const oiDir: Dir = classifyDir(ohlcToSeries(oi, 24));
  const priceDir: Dir = change24h > 0.5 ? 'up' : change24h < -0.5 ? 'down' : 'flat';
  const oiVsPriceScore: -1 | 0 | 1 =
    oiDir === 'up' && priceDir === 'up' ? 1 : oiDir === 'up' && priceDir === 'flat' ? -1 : 0;

  const r = computeRegime({
    fearGreed: fg,
    etfFlowScore: etfScore,
    longShortPctLong: pctLong,
    fundingRate: fundingPct,
    oiVsPriceScore,
  });
  const conf = r.confidence;
  return {
    asset,
    price: Number(price.toFixed(price >= 100 ? 2 : 4)),
    change24h: Number(change24h.toFixed(2)),
    regime: floorRegime(toRegime(r.verdict.label), conf),
    confidence: Number(conf.toFixed(2)),
    // Raw engine outputs — used to derive the Global Regime tile, not shown per-chip.
    verdict: r.verdict,
    rawConf: conf,
  };
}

export async function makeConsolePayloadLive(): Promise<ConsolePayload> {
  const [fg, btcEtf, ethEtf, glsBtc, liqCoin, liqAggBtc, flowEvents, intel, goldPairs] = await Promise.all([
    fearGreed().catch(() => null),
    etfFlow('bitcoin').catch(() => []),
    etfFlow('ethereum').catch(() => []),
    globalLongShort('BTCUSDT', '1h').catch(() => []),
    liqCoinList().catch(() => []),
    liqAggHistory('BTC', '1h').catch(() => []),
    buildFlowEvents().catch(() => []),
    makeIntelligencePayloadLive('free').catch(() => ({ briefs: [] })),
    pairsMarkets('XAUT').catch(() => []),
  ]);

  const fgValue = fg?.data_list?.length ? fg.data_list[fg.data_list.length - 1] : 50;
  const fgClass = classifyFearGreed(fgValue);

  // ETF 7d flow + prev-7d comparison.
  const last7 = btcEtf.slice(-7);
  const prev7 = btcEtf.slice(-14, -7);
  const etf7d = last7.reduce((a, b) => a + (b.flow_usd || 0), 0);
  const etfPrev = prev7.reduce((a, b) => a + (b.flow_usd || 0), 0);
  const etfPctVsPrev = etfPrev !== 0 ? ((etf7d - etfPrev) / Math.abs(etfPrev)) * 100 : 0;
  const btcEtfScore: -1 | 0 | 1 = etf7d > 0 ? 1 : etf7d < 0 ? -1 : 0;
  const ethEtf7d = ethEtf.slice(-7).reduce((a, b) => a + (b.flow_usd || 0), 0);
  const ethEtfScore: -1 | 0 | 1 = ethEtf7d > 0 ? 1 : ethEtf7d < 0 ? -1 : 0;

  // On-chain bias.
  const glsLatest = glsBtc.length ? glsBtc[glsBtc.length - 1] : null;
  const pctLong = glsLatest?.global_account_long_percent ?? 50;
  const ratio = glsLatest?.global_account_long_short_ratio ?? 1;

  // 24h liquidations total + vs 7d avg.
  const liq24hTotal = liqCoin.reduce((a, b) => a + (b.liquidation_usd_24h || 0), 0);
  const aggPerHour = liqAggBtc.map((x) => (x.aggregated_long_liquidation_usd || 0) + (x.aggregated_short_liquidation_usd || 0));
  const last24 = aggPerHour.slice(-24).reduce((a, b) => a + b, 0);
  const totalAgg = aggPerHour.reduce((a, b) => a + b, 0);
  const windows = Math.max(1, aggPerHour.length / 24);
  const avgPer24 = totalAgg / windows;
  const liqPctVsAvg = avgPer24 > 0 ? ((last24 - avgPer24) / avgPer24) * 100 : 0;

  // Regime chips.
  const [btc, eth, sol] = await Promise.all([
    assetRegime('BTC', btcEtfScore, fgValue),
    assetRegime('ETH', ethEtfScore, fgValue),
    assetRegime('SOL', 0, fgValue),
  ]);
  const goldPrimary = primaryPair(goldPairs);
  const goldChange = goldPrimary?.price_change_percent_24h ?? 0;
  const goldConf = 0.5;
  const goldRaw: 'Bullish' | 'Neutral' | 'Bearish' = goldChange > 1 ? 'Bullish' : goldChange < -1 ? 'Bearish' : 'Neutral';
  const gold = {
    asset: 'GOLD' as const,
    price: Number((goldPrimary?.current_price ?? 0).toFixed(2)),
    change24h: Number(goldChange.toFixed(2)),
    regime: floorRegime(goldRaw, goldConf),
    confidence: goldConf,
  };
  const spx = { asset: 'SPX' as const, price: 0, change24h: 0, regime: 'Neutral' as const, confidence: 0 };

  // Keep only the 5 contract fields per chip (drop the raw verdict/rawConf helpers).
  type Chip = ConsolePayload['regimeChips'][number];
  const chip = (x: typeof btc, asset: Chip['asset']): Chip => ({
    asset, price: x.price, change24h: x.change24h, regime: x.regime, confidence: x.confidence,
  });
  const regimeChips: ConsolePayload['regimeChips'] = [
    chip(btc, 'BTC'), chip(eth, 'ETH'), chip(sol, 'SOL'), gold, spx,
  ];

  // Global Regime = the regime engine's verdict (BTC as the market proxy), with a
  // confidence floor — NOT the Fear & Greed label (that stays on the sentiment bar).
  const globalVerdict = floorGlobalVerdict(btc.verdict, btc.rawConf);

  // Heatmap preview from liquidation coin-list.
  const previewAssets = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX'];
  const heatmapPreview = previewAssets.map((a) => {
    const row = liqCoin.find((l) => l.symbol === a);
    const long = row?.long_liquidation_usd_24h ?? 0;
    const short = row?.short_liquidation_usd_24h ?? 0;
    const longShare = long + short > 0 ? (long / (long + short)) * 100 : 50;
    return { asset: a, liqUsd24h: Math.round(row?.liquidation_usd_24h ?? 0), longShare: Number(longShare.toFixed(1)) };
  });

  // Radar watchlist (auto-scored from flow events, enriched with price).
  const radar = computeRadarWatchlist({
    events: flowEvents.map((e) => ({ type: e.type, asset: e.asset, direction: e.direction, severity: e.severity, ts: e.ts })),
    now: Date.now(),
  });
  const radarWatchlist = await Promise.all(radar.entries.map(async (e) => {
    const pairs = await pairsMarkets(e.asset).catch(() => []);
    const p = primaryPair(pairs);
    return {
      asset: e.asset,
      price: Number((p?.current_price ?? 0).toFixed((p?.current_price ?? 0) >= 100 ? 2 : 4)),
      change24h: Number((p?.price_change_percent_24h ?? 0).toFixed(2)),
      signal: e.signal,
    };
  }));

  // Market-conditions tags.
  const tags: Verdict[] = [];
  if (pctLong > 60) tags.push({ label: '· Longs Crowded', color: 'amber' });
  else if (pctLong < 40) tags.push({ label: '· Shorts Crowded', color: 'amber' });
  if (etf7d > 0) tags.push({ label: '· ETF Inflows', color: 'grey-green' });
  else if (etf7d < 0) tags.push({ label: '· ETF Outflows', color: 'grey-red' });

  const intelPreview = intel.briefs.slice(0, 4).map((b) => ({
    tier: b.tier, headline: b.headline, category: b.category, source: b.source, ts: b.ts,
  }));

  return {
    marketConditions: {
      verdict: globalVerdict,
      fearGreedLabel: fgClass.label,
      fearGreedColor: fgClass.color,
      tags: tags.slice(0, 2),
      confidence: btc.confidence,
      updatedAt: nowIso(),
      fearGreed: fgValue,
      tiles: {
        etfFlow7d: { usd: Math.round(etf7d), pctVsPrev: Number(etfPctVsPrev.toFixed(1)) },
        dxy: null, // macro source = coming soon
        onChainBias: { pctLong: Number(pctLong.toFixed(1)), ratio: Number(ratio.toFixed(2)) },
        liq24h: { totalUsd: Math.round(liq24hTotal), pctVsAvg7d: Number(liqPctVsAvg.toFixed(1)) },
      },
    },
    regimeChips,
    heatmapPreview,
    flowRadar: flowEvents.slice(0, 6),
    intelPreview,
    radarWatchlist: radarWatchlist.slice(0, 4),
  };
}
