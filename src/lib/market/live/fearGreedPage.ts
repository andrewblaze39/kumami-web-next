/**
 * Live Fear & Greed composite payload — standalone /world/fear-greed tab.
 *
 * 5 sub-metrics weighted per Kumami Plus §6, tracked basket BTC/ETH/SOL/BNB/HYPE
 * (weights 50/25/10/10/5 per the doc). Two source substitutions from the doc,
 * disclosed here:
 *   - Price Momentum + Volatility both derive from CoinGlass daily price
 *     history (doc suggested CoinGecko for momentum specifically) — keeps
 *     everything on one already-integrated provider instead of adding a new
 *     per-asset CoinGecko id mapping just for HYPE.
 *   - Market Composition reuses CoinGlass's own stablecoin index (already used
 *     by the On-Chain "Stablecoin Supply" tile) instead of a new DefiLlama
 *     integration — same underlying concept (total stablecoin market cap).
 *   - News Tone has no live LLM wired yet, so it's a lightweight keyword
 *     heuristic over real Intelligence headlines — marked "Estimated" in the
 *     UI per the doc's own instruction for this sub-metric.
 */

import type { FearGreedPayload } from '../contracts';
import {
  scorePriceMomentum, scoreLongShortSentiment, scoreVolatility,
  scoreMarketComposition, scoreNewsTone, computeCompositeFearGreed,
} from '../rules/fearGreedComposite';
import { fearGreed, globalLongShort, stablecoinMcap, priceHistory } from './cg-endpoints';
import { pairSymbol } from './helpers';
import { makeIntelligencePayloadLive } from './intel';

const BASKET: { asset: string; weight: number }[] = [
  { asset: 'BTC', weight: 0.50 },
  { asset: 'ETH', weight: 0.25 },
  { asset: 'SOL', weight: 0.10 },
  { asset: 'BNB', weight: 0.10 },
  { asset: 'HYPE', weight: 0.05 },
];

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) out.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return out;
}

const BULLISH_WORDS = [
  'surge', 'rally', 'inflow', 'bullish', 'gain', 'breakout', 'accumulat',
  'record high', 'adoption', 'upgrade', 'partnership', 'soar', 'jump', 'buy',
];
const BEARISH_WORDS = [
  'crash', 'selloff', 'sell-off', 'bearish', 'outflow', 'hack', 'exploit',
  'ban', 'lawsuit', 'decline', 'drop', 'liquidat', 'dump', 'fear', 'plunge', 'halt',
];

function classifyHeadline(headline: string): 'bullish' | 'bearish' | 'neutral' {
  const h = headline.toLowerCase();
  const bull = BULLISH_WORDS.filter((w) => h.includes(w)).length;
  const bear = BEARISH_WORDS.filter((w) => h.includes(w)).length;
  if (bull > bear) return 'bullish';
  if (bear > bull) return 'bearish';
  return 'neutral';
}

/**
 * Per-asset momentum % and 7D/30D volatility ratio from daily closes.
 * Returns `null` for both when the price-history fetch fails OR there's
 * genuinely too little history to compute a meaningful reading — either way
 * this asset must not contribute a fake "flat/normal" number to the basket
 * average, which is instead re-weighted over whichever assets did succeed.
 */
async function assetMomentumAndVol(asset: string): Promise<{ momentumPct: number; volRatio: number } | null> {
  const rows = await priceHistory(asset, '1d').catch(() => []);
  const closes = rows.map((r) => Number(r.close)).filter((n) => Number.isFinite(n) && n > 0);
  if (closes.length < 8) return null;

  const current = closes[closes.length - 1];
  const last30 = closes.slice(Math.max(0, closes.length - 31), closes.length - 1);
  const avg30 = last30.length ? last30.reduce((a, b) => a + b, 0) / last30.length : current;
  const momentumPct = avg30 > 0 ? ((current - avg30) / avg30) * 100 : 0;

  const returns = dailyReturns(closes);
  const ret7 = returns.slice(-7);
  const ret30 = returns.slice(-30);
  const vol7 = stddev(ret7) * Math.sqrt(365);
  const vol30 = stddev(ret30) * Math.sqrt(365);
  const volRatio = vol30 > 0 ? vol7 / vol30 : 1;

  return { momentumPct, volRatio };
}

/** null when the long/short fetch fails for this asset — never a fake 50/50. */
async function assetLongPct(asset: string): Promise<number | null> {
  const rows = await globalLongShort(pairSymbol(asset), '1h').catch(() => null);
  return rows?.length ? rows[rows.length - 1].global_account_long_percent : null;
}

/** Weighted average over only the entries that actually resolved, re-normalised
 * against the weight that's actually present — a partial outage degrades the
 * average's precision, not its honesty (never dilutes toward a fake neutral). */
function weightedAvg(entries: { weight: number; value: number | null }[], fallback: number): { value: number; hasAny: boolean } {
  const present = entries.filter((e): e is { weight: number; value: number } => e.value !== null);
  const weightSum = present.reduce((s, e) => s + e.weight, 0);
  if (weightSum <= 0) return { value: fallback, hasAny: false };
  return { value: present.reduce((s, e) => s + e.weight * e.value, 0) / weightSum, hasAny: true };
}

export async function makeFearGreedPayloadLive(): Promise<FearGreedPayload> {
  const [rawFg, stable, intel, basketStats, basketLongPct] = await Promise.all([
    fearGreed().catch(() => null),
    stablecoinMcap().catch(() => null),
    makeIntelligencePayloadLive('free').catch(() => ({ briefs: [] })),
    Promise.all(BASKET.map((b) => assetMomentumAndVol(b.asset))),
    Promise.all(BASKET.map((b) => assetLongPct(b.asset))),
  ]);

  // --- Sub-metric 1 + 3: weighted basket momentum & volatility ratio -------
  // Renormalised over whichever basket assets actually resolved — a partial
  // outage narrows the sample, it doesn't get diluted toward a fake neutral.
  const momentumAvg = weightedAvg(
    BASKET.map((b, i) => ({ weight: b.weight, value: basketStats[i]?.momentumPct ?? null })), 0,
  );
  const volAvg = weightedAvg(
    BASKET.map((b, i) => ({ weight: b.weight, value: basketStats[i]?.volRatio ?? null })), 1,
  );
  const basketMomentum = momentumAvg.value;
  const basketVolRatio = volAvg.value;
  const momentumScore = scorePriceMomentum(basketMomentum);
  const vol = scoreVolatility(basketVolRatio);

  // --- Sub-metric 2: weighted basket long % ---------------------------------
  const longAvg = weightedAvg(
    BASKET.map((b, i) => ({ weight: b.weight, value: basketLongPct[i] })), 50,
  );
  const basketLongPctAvg = longAvg.value;
  const lsScore = scoreLongShortSentiment(basketLongPctAvg);

  // --- Sub-metric 4: stablecoin supply 7D change -----------------------------
  // stable is null only on a genuine fetch failure (stablecoinMcap already
  // resolves that way) — never fabricate a "$0 change" from a dead endpoint.
  const stableFailed = stable === null;
  const dl = stable?.data_list ?? [];
  const tl = stable?.time_list ?? [];
  const totals = dl.map((m) => Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0));
  const latestTotal = totals[totals.length - 1] ?? 0;
  const idx7 = Math.max(0, totals.length - 8);
  const total7 = totals[idx7] ?? latestTotal;
  const change7dUsd = stableFailed ? null : latestTotal - total7;
  const compScore = scoreMarketComposition(change7dUsd ?? 0);

  // --- Sub-metric 5: news tone (estimated, keyword heuristic) ---------------
  const headlines = intel.briefs.map((b) => b.headline);
  const classified = headlines.map(classifyHeadline);
  const bullishCount = classified.filter((c) => c === 'bullish').length;
  const newsUnavailable = headlines.length === 0;
  const bullishPct = newsUnavailable ? 50 : (bullishCount / headlines.length) * 100;
  const newsScore = scoreNewsTone(bullishPct);

  const composite = {
    ...computeCompositeFearGreed({
      priceMomentum: momentumScore,
      longShortSentiment: lsScore,
      volatility: vol.score,
      marketComposition: compScore,
      newsTone: newsScore,
    }),
    // Every sub-metric failed — the weighted score above is built entirely
    // from neutral fallbacks, not a real reading. Flag it rather than show a
    // synthesized number as if it meant something.
    unavailable: !momentumAvg.hasAny && !longAvg.hasAny && !volAvg.hasAny && stableFailed && newsUnavailable,
  };

  // --- Historical chart: raw index history as a proxy trend line -----------
  const fgSeries = (rawFg?.data_list ?? []).map((v, i) => ({
    t: (rawFg?.time_list?.[i] ?? 0) * 1000,
    v: Number(v),
  })).filter((p) => p.t > 0);

  return {
    composite,
    subMetrics: {
      priceMomentum: {
        score: momentumScore,
        value: Number(basketMomentum.toFixed(1)),
        label: 'Price Momentum',
        source: 'Tracked basket · daily closes',
        unavailable: !momentumAvg.hasAny,
      },
      longShortSentiment: {
        score: lsScore,
        value: Number(basketLongPctAvg.toFixed(1)),
        label: 'Long/Short Sentiment',
        source: 'Exchange APIs · avg top traders',
        unavailable: !longAvg.hasAny,
      },
      volatility: {
        score: vol.score,
        value: vol.label,
        label: 'Volatility · 7D vs 30D',
        source: 'Kumami OHLC history',
        unavailable: !volAvg.hasAny,
      },
      marketComposition: {
        score: compScore,
        value: change7dUsd ?? 0,
        label: 'Market Composition',
        source: 'Stablecoin market cap · 7D change',
        unavailable: stableFailed,
      },
      newsTone: {
        score: newsScore,
        value: Number(bullishPct.toFixed(0)),
        label: 'News Tone',
        source: 'AI scoring (estimated) · pipeline in progress',
        estimated: true,
        unavailable: newsUnavailable,
      },
    },
    history: fgSeries,
    updatedAt: new Date().toISOString(),
  };
}
