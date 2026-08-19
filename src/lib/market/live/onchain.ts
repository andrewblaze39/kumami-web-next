/**
 * Live On-Chain Insights payload (9 live panels + heatmap coming-soon).
 *
 * Each panel feeds real CoinGlass series into its rule engine and assembles the
 * OnChainPayload contract. Every panel is wrapped in a try/catch so a single
 * failing/empty endpoint degrades that one panel to a neutral state instead of
 * failing the whole page.
 */

import type { OnChainPayload, PanelVerdict, Series, Verdict, MetricPanelKey } from '../contracts';
import { computeFunding } from '../rules/funding';
import { computeLiquidations } from '../rules/liquidations';
import { computeNetflow } from '../rules/netflow';
import { computeLongShort } from '../rules/longshort';
import { computeCVD, type Direction } from '../rules/cvd';
import { computePremium } from '../rules/premium';
import { computeEtf } from '../rules/etf';
import { computeOi } from '../rules/oi';
import { computeStablecoin } from '../rules/stablecoin';
import {
  fundingOiWeight, oiAggHistory, liqCoinList, liqAggHistory, globalLongShort,
  topLongShort, cvdHistory, coinbasePremium, etfFlow, exchangeBalance,
  exchangeBalanceChart, stablecoinMcap, pairsMarkets, priceHistory,
  type OHLC, type LiqCoinRow, type LiqAggRow, type GlsRow, type TlsRow,
  type CvdRow, type PremiumRow, type EtfFlowRow, type ExchBalanceRow, type PairMarketRow,
} from './cg-endpoints';
import {
  rangeToInterval, ohlcToSeries, toSeries, classifyDir, primaryPair,
  pairSymbol, hasPerp, nowIso, latestClose, type Range, type Dir,
} from './helpers';

type Panel = PanelVerdict & {
  headline: string;
  series?: Series;
  series2?: Series;
  extra?: Record<string, number | string>;
};

function panel(verdict: Verdict, headline: string, opts: Partial<Panel> = {}): Panel {
  return {
    verdict,
    tags: opts.tags ?? [],
    confidence: opts.confidence,
    updatedAt: nowIso(),
    headline,
    ...(opts.series ? { series: opts.series } : {}),
    ...(opts.series2 ? { series2: opts.series2 } : {}),
    extra: opts.extra ?? {},
  };
}

const neutral = (headline: string, extra: Record<string, number | string> = {}): Panel =>
  panel({ label: 'No Data', color: 'grey' }, headline, { extra });

const cvdDir = (s: Series, flat = 0.05): Direction => classifyDir(s, flat) as Direction;
const num = (v: string | number) => (typeof v === 'number' ? v : parseFloat(v));

export async function makeOnChainPayloadLive(asset: string, range: Range): Promise<OnChainPayload> {
  const { interval, points } = rangeToInterval(range);
  const A = asset.toUpperCase();
  const pair = pairSymbol(A);
  const perp = hasPerp(A);
  const etfChain = A === 'ETH' ? 'ethereum' : 'bitcoin';

  // Fetch everything in parallel; each panel guards its own inputs.
  const empty = <T>(): T[] => [];
  const [
    fundingRows, oiRows, liqCoin, liqAgg, gls, tls, cvdFut, cvdSpot,
    premiumRows, etfRows, exchBal, exchBalChart, stable, pairs, priceRows,
  ] = await Promise.all([
    fundingOiWeight(A, interval).catch(empty<OHLC>),
    oiAggHistory(A, interval).catch(empty<OHLC>),
    liqCoinList().catch(empty<LiqCoinRow>),
    perp ? liqAggHistory(A, interval).catch(empty<LiqAggRow>) : Promise.resolve(empty<LiqAggRow>()),
    perp ? globalLongShort(pair, interval).catch(empty<GlsRow>) : Promise.resolve(empty<GlsRow>()),
    perp ? topLongShort(pair, interval).catch(empty<TlsRow>) : Promise.resolve(empty<TlsRow>()),
    perp ? cvdHistory('futures', A, interval).catch(empty<CvdRow>) : Promise.resolve(empty<CvdRow>()),
    perp ? cvdHistory('spot', A, interval).catch(empty<CvdRow>) : Promise.resolve(empty<CvdRow>()),
    coinbasePremium(interval).catch(empty<PremiumRow>),
    etfFlow(etfChain).catch(empty<EtfFlowRow>),
    exchangeBalance(A).catch(empty<ExchBalanceRow>),
    exchangeBalanceChart(A).catch(() => null),
    stablecoinMcap().catch(() => null),
    pairsMarkets(A).catch(empty<PairMarketRow>),
    perp ? priceHistory(pair, interval).catch(empty<OHLC>) : Promise.resolve(empty<OHLC>()),
  ]);

  const primary = primaryPair(pairs);
  const price = primary?.current_price ?? 0;
  const change24h = primary?.price_change_percent_24h ?? 0;
  const priceSeries = ohlcToSeries(priceRows, points);
  const priceDir: Dir = priceSeries.length >= 2 ? classifyDir(priceSeries) : (change24h > 1 ? 'up' : change24h < -1 ? 'down' : 'flat');

  // Exchange-balance netflow (shared by netflow + premium/etf cross-signals).
  const balField: 'balance_change_1d' | 'balance_change_7d' | 'balance_change_30d' =
    range === '24h' ? 'balance_change_1d' : range === '7d' ? 'balance_change_7d' : 'balance_change_30d';
  const netBalanceQty = exchBal.reduce((acc, r) => acc + (Number(r[balField]) || 0), 0);
  // Positive netUsd = net OUTFLOW = accumulation. Balance falling (negative change) = outflow.
  const netUsd = -netBalanceQty * (price || 0);
  const exchangeFlowDir: 'inflow' | 'outflow' | 'neutral' =
    netUsd > 50_000_000 ? 'outflow' : netUsd < -50_000_000 ? 'inflow' : 'neutral';

  const panels = {} as OnChainPayload['panels'];

  // ---- funding -----------------------------------------------------------
  try {
    const closesPct = fundingRows.map((r) => num(r.close) * 100); // decimal → percent
    const last3 = closesPct.slice(-3);
    const avg3 = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : 0;
    const currentRatePct = closesPct.length ? closesPct[closesPct.length - 1] : 0;
    const delta24h = closesPct.length >= 2 ? currentRatePct - closesPct[Math.max(0, closesPct.length - 25)] : 0;
    const r = computeFunding({ avg3Cycle: avg3, cycleHistory: closesPct, delta24h });
    panels.funding = panel(r.verdict, `Funding ${currentRatePct.toFixed(4)}% — ${r.verdict.label}`, {
      tags: r.tags,
      series: toSeries(fundingRows, points, (x) => Number(x.time), (x) => num(x.close) * 100),
      extra: { asset: A, range, currentRatePct: Number(currentRatePct.toFixed(4)) },
    });
  } catch { panels.funding = neutral('Funding rate unavailable', { asset: A, range }); }

  // ---- liquidations ------------------------------------------------------
  try {
    const row = liqCoin.find((l) => l.symbol === A);
    const totalUsd = row?.liquidation_usd_24h ?? 0;
    const longUsd = row?.long_liquidation_usd_24h ?? 0;
    const shortUsd = row?.short_liquidation_usd_24h ?? 0;
    const longRatio = longUsd + shortUsd > 0 ? longUsd / (longUsd + shortUsd) : 0.5;
    const r = computeLiquidations({ totalUsd, longRatio });
    const series = toSeries(liqAgg, points, (x) => Number(x.time),
      (x) => (x.aggregated_long_liquidation_usd || 0) + (x.aggregated_short_liquidation_usd || 0));
    panels.liquidations = panel(r.verdict, `$${(totalUsd / 1e6).toFixed(0)}M liquidated 24h — ${r.verdict.label}`, {
      tags: r.tags,
      series: series.length ? series : undefined,
      extra: { asset: A, range, totalUsd: Math.round(totalUsd), longPct: Number((longRatio * 100).toFixed(1)) },
    });
  } catch { panels.liquidations = neutral('Liquidations unavailable', { asset: A, range }); }

  // ---- netflow (exchange balance) ---------------------------------------
  try {
    const priceChange = change24h / 100;
    const flowAccelerating = Math.abs(netUsd) > 50_000_000;
    const r = computeNetflow({ netUsd, priceChange, flowAccelerating });
    // Series: total exchange balance over time (falling = outflow = bullish).
    let series: Series | undefined;
    if (exchBalChart?.time_list?.length && exchBalChart.data_map) {
      const times = exchBalChart.time_list;
      const totals = times.map((_, i) =>
        Object.values(exchBalChart.data_map).reduce((acc, arr) => acc + (Number(arr?.[i]) || 0), 0));
      series = toSeries(totals.map((v, i) => ({ t: times[i], v })), points, (x) => x.t, (x) => x.v);
    }
    const dir = netUsd >= 0 ? 'outflow' : 'inflow';
    panels.netflow = panel(r.verdict, `${(Math.abs(netUsd) / 1e6).toFixed(0)}M net ${dir} — ${r.verdict.label}`, {
      tags: r.tags,
      series,
      extra: { asset: A, range, netUsd: Math.round(netUsd) },
    });
  } catch { panels.netflow = neutral('Exchange netflow unavailable', { asset: A, range }); }

  // ---- longshort ---------------------------------------------------------
  try {
    const globalPctLong = gls.length ? gls[gls.length - 1].global_account_long_percent : 50;
    const topTraderPctLong = tls.length ? tls[tls.length - 1].top_account_long_percent : globalPctLong;
    const r = computeLongShort({ globalPctLong, topTraderPctLong });
    panels.longshort = panel(r.verdict, `Long ${globalPctLong.toFixed(1)}% / Short ${(100 - globalPctLong).toFixed(1)}% — ${r.verdict.label}`, {
      tags: r.tags,
      series: toSeries(gls, points, (x) => Number(x.time), (x) => x.global_account_long_percent),
      series2: toSeries(tls, points, (x) => Number(x.time), (x) => x.top_account_long_percent),
      extra: { asset: A, range, globalPctLong: Number(globalPctLong.toFixed(1)), topTraderPctLong: Number(topTraderPctLong.toFixed(1)) },
    });
  } catch { panels.longshort = neutral('Long/short ratio unavailable', { asset: A, range }); }

  // ---- heatmap (tier-locked → coming soon) ------------------------------
  panels.heatmap = panel({ label: 'Coming Soon', color: 'grey' }, 'Liquidation heatmap — coming soon', {
    extra: { asset: A, range, comingSoon: 1 },
  });

  // ---- cvd ---------------------------------------------------------------
  try {
    const futSeries = toSeries(cvdFut, points, (x) => Number(x.time), (x) => x.cum_vol_delta);
    const spotSeries = toSeries(cvdSpot, points, (x) => Number(x.time), (x) => x.cum_vol_delta);
    const futD = cvdDir(futSeries);
    const spotD = cvdDir(spotSeries);
    const r = computeCVD({
      priceDirection: priceDir as Direction,
      cvdDirection: futD,
      spotCVDDirection: spotD,
      futuresCVDDirection: futD,
    });
    panels.cvd = panel(r.verdict, `CVD ${futD} vs price ${priceDir} — ${r.verdict.label}`, {
      tags: r.tags,
      series: futSeries.length ? futSeries : undefined,
      series2: spotSeries.length ? spotSeries : undefined,
      extra: { asset: A, range },
    });
  } catch { panels.cvd = neutral('CVD unavailable', { asset: A, range }); }

  // ---- premium (BTC metric) ---------------------------------------------
  try {
    const rates = premiumRows.map((r) => r.premium_rate);
    const latestPct = rates.length ? rates[rates.length - 1] : 0;
    const premiumDecimal = latestPct / 100;
    // 7D trend from the tail of the series.
    const tail = rates.slice(-Math.min(rates.length, 42));
    const allPos = tail.length > 0 && tail.every((v) => v > 0);
    const prev = tail.length >= 2 ? tail[0] : latestPct;
    let trend7d: 'positive_streak' | 'flipped_positive' | 'flipped_negative' | 'none' = 'none';
    if (allPos) trend7d = 'positive_streak';
    else if (prev <= 0 && latestPct > 0) trend7d = 'flipped_positive';
    else if (prev >= 0 && latestPct < 0) trend7d = 'flipped_negative';
    const r = computePremium({ premium: premiumDecimal, trend7d, exchangeFlow: exchangeFlowDir });
    panels.premium = panel(r.verdict, `Coinbase premium ${latestPct.toFixed(3)}% — ${r.verdict.label}`, {
      tags: r.tags,
      series: toSeries(premiumRows, points, (x) => Number(x.time) * (x.time < 1e12 ? 1000 : 1), (x) => x.premium_rate),
      extra: { asset: 'BTC', range, premiumPct: Number(latestPct.toFixed(4)) },
    });
  } catch { panels.premium = neutral('Coinbase premium unavailable', { asset: A, range }); }

  // ---- etf ---------------------------------------------------------------
  try {
    const last = etfRows[etfRows.length - 1];
    const dailyFlowUsd = last?.flow_usd ?? 0;
    const last7 = etfRows.slice(-7);
    const flow7dUsd = last7.reduce((a, b) => a + (b.flow_usd || 0), 0);
    const p0 = last7[0]?.price_usd ?? last?.price_usd ?? 0;
    const pN = last?.price_usd ?? 0;
    const priceChange7d = p0 ? (pN - p0) / p0 : 0;
    const premRates = premiumRows.map((r) => r.premium_rate);
    const coinbasePremiumRising = premRates.length >= 2 && premRates[premRates.length - 1] > premRates[premRates.length - 2];
    const r = computeEtf({ dailyFlowUsd, flow7dUsd, priceChange7d, coinbasePremiumRising, exchangeFlow: exchangeFlowDir });
    const flowSeries = toSeries(etfRows, 30, (x) => Number(x.timestamp), (x) => x.flow_usd);
    const priceOverlay = toSeries(etfRows, 30, (x) => Number(x.timestamp), (x) => x.price_usd);
    panels.etf = panel(r.verdict, `$${(flow7dUsd / 1e6).toFixed(0)}M 7d ETF flow — ${r.cumulative7d.label}`, {
      tags: r.tags,
      series: flowSeries.length ? flowSeries : undefined,
      series2: priceOverlay.length ? priceOverlay : undefined,
      extra: { asset: etfChain === 'ethereum' ? 'ETH' : 'BTC', range: '30d', net7dUsd: Math.round(flow7dUsd) },
    });
  } catch { panels.etf = neutral('ETF flow unavailable', { asset: A, range }); }

  // ---- oi ----------------------------------------------------------------
  try {
    const oiSeries = ohlcToSeries(oiRows, points);
    const oiDir = oiSeries.length >= 2 ? classifyDir(oiSeries) : 'flat';
    const r = computeOi({ oiDirection: oiDir, priceDirection: priceDir });
    const latestOi = latestClose(oiRows);
    panels.oi = panel(r.verdict, `OI $${(latestOi / 1e9).toFixed(1)}B — ${r.verdict.label}`, {
      tags: r.tags,
      series: oiSeries.length ? oiSeries : undefined,
      series2: priceSeries.length ? priceSeries : undefined,
      extra: { asset: A, range },
    });
  } catch { panels.oi = neutral('Open interest unavailable', { asset: A, range }); }

  // ---- stablecoin --------------------------------------------------------
  try {
    const dl = stable?.data_list ?? [];
    const tl = stable?.time_list ?? [];
    const totals = dl.map((m) => Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0));
    const latestTotal = totals[totals.length - 1] ?? 0;
    const idx30 = Math.max(0, totals.length - 31);
    const total30 = totals[idx30] ?? latestTotal;
    const change30d = total30 ? (latestTotal - total30) / total30 : 0;
    const r = computeStablecoin({ change30d });
    const series = toSeries(totals.map((v, i) => ({ t: tl[i] ?? 0, v })), 30, (x) => x.t, (x) => x.v);
    panels.stablecoin = panel(r.verdict, `$${(latestTotal / 1e9).toFixed(1)}B stablecoin cap (${(change30d * 100).toFixed(1)}% 30d) — ${r.verdict.label}`, {
      tags: r.tags,
      series: series.length ? series : undefined,
      extra: { asset: A, range, change30dPct: Number((change30d * 100).toFixed(2)) },
    });
  } catch { panels.stablecoin = neutral('Stablecoin supply unavailable', { asset: A, range }); }

  // Guard: ensure every MetricPanelKey exists.
  const KEYS: MetricPanelKey[] = ['funding', 'liquidations', 'netflow', 'longshort', 'heatmap', 'cvd', 'premium', 'etf', 'oi', 'stablecoin'];
  for (const k of KEYS) if (!panels[k]) panels[k] = neutral(`${k} unavailable`, { asset: A, range });

  return { asset: A, range, panels };
}
