/**
 * Spot Pulse builder — assembles the SpotPulsePayload from live CoinGlass data.
 *
 * Source: Rachelle's "Spot Pulse" spec. Answers "where is real money moving?"
 * by comparing spot CVD vs futures CVD vs price per asset (§3), then a
 * market-wide verdict (§4), divergence alert cards (§5) and footer stats (§6).
 *
 * Feasibility: the verdict engine is fully live (spot + futures aggregated-CVD,
 * price history). Per-asset spot *volume* and the Pro Row-2 dynamic trending
 * selection need /api/spot/coins-markets, which is tier-locked on the current
 * key — so this builds the 5 fixed anchors (Plus); Pro Row-2 awaits a plan upgrade.
 */

import type { SpotPulsePayload, SpotPulseTile, SpotPulseAlert } from '../contracts';
import {
  computeSpotVerdict,
  computeMarketVerdict,
  divergenceScore,
  MARKET_SENTENCE,
  type SpotVerdict,
  type SpotVerdictResult,
} from '../rules/spotPulse';
import { cvdHistory, priceHistory, netflowList, type CvdRow } from './cg-endpoints';
import { pairSymbol, nowIso } from './helpers';

const ANCHORS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

export type SpotPulseTimeframe = '4H' | '24H' | '7D';

/**
 * §7 timeframe toggle. Each window reads CVD/price at a matching bar interval,
 * so the "delta" is the last bar over that window and the range (§3) is the
 * std-dev of same-interval deltas — apples-to-apples at any timeframe.
 */
const TF_CFG: Record<SpotPulseTimeframe, { interval: string; rangeBars: number }> = {
  '4H': { interval: '4h', rangeBars: 42 }, // ~7d of 4h bars
  '24H': { interval: '1d', rangeBars: 30 }, // ~30d of daily bars
  '7D': { interval: '1w', rangeBars: 26 }, // ~6mo of weekly bars
};

/** Per-bar CVD delta = aggressive taker buy − sell. */
const barDelta = (r: CvdRow) => (Number(r.agg_taker_buy_vol) || 0) - (Number(r.agg_taker_sell_vol) || 0);

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

type Built = {
  tile: SpotPulseTile;
  res: SpotVerdictResult;
  spotCvdChange: number;
  priceChange4h: number;
};

async function buildAsset(asset: string, row: 1 | 2, tf: SpotPulseTimeframe): Promise<Built | null> {
  const pair = pairSymbol(asset);
  const { interval, rangeBars } = TF_CFG[tf];
  // null (not []) distinguishes "the fetch failed" from "the fetch succeeded
  // with genuinely no rows" — the former must never silently feed a fake 0
  // into a displayed CVD/price change.
  const [spotCvdRaw, futCvdRaw, priceRowsRaw] = await Promise.all([
    cvdHistory('spot', asset, interval).catch(() => null as CvdRow[] | null),
    cvdHistory('futures', asset, interval).catch(() => null as CvdRow[] | null),
    priceHistory(pair, interval).catch(() => null),
  ]);
  const spotCvd = spotCvdRaw ?? [];
  const futCvd = futCvdRaw ?? [];
  const priceRows = priceRowsRaw ?? [];
  const futFailed = futCvdRaw === null;
  const priceFailed = priceRowsRaw === null;

  // No CVD at all on either side → skip the tile entirely (§11).
  if (!spotCvd.length && !futCvd.length) return null;

  const spotCvdChange = spotCvd.length ? barDelta(spotCvd[spotCvd.length - 1]) : 0;
  const futCvdChange = futCvd.length ? barDelta(futCvd[futCvd.length - 1]) : 0;
  const spotCvdRange = stddev(spotCvd.slice(-rangeBars).map(barDelta));
  const futCvdRange = stddev(futCvd.slice(-rangeBars).map(barDelta));

  let priceChange4h = 0;
  if (priceRows.length >= 2) {
    const c1 = Number(priceRows[priceRows.length - 1].close);
    const c0 = Number(priceRows[priceRows.length - 2].close);
    priceChange4h = c0 ? ((c1 - c0) / c0) * 100 : 0;
  }

  const res = computeSpotVerdict({ priceChange4h, spotCvdChange, futCvdChange, spotCvdRange, futCvdRange });
  // Insufficient (renders "NO DATA" / '—' on the tile, per the UI's existing
  // convention) when the spot side is genuinely missing (spec §11), OR when
  // the futures/price fetch outright failed — in either failure case the
  // 0-fallbacks above would otherwise masquerade as a real flat reading.
  const insufficient = !spotCvd.length || futFailed || priceFailed;

  const tile: SpotPulseTile = insufficient
    ? {
        asset, verdict: 'BALANCED', color: 'rgba(120,200,170,0.15)', glow: false,
        priceChange4h: Number(priceChange4h.toFixed(2)),
        spotCvdChange: Math.round(spotCvdChange), futCvdChange: Math.round(futCvdChange),
        spotToFutRatio: 0, row, insufficient: true,
      }
    : {
        asset, verdict: res.verdict, color: res.color, glow: res.glow,
        priceChange4h: Number(priceChange4h.toFixed(2)),
        spotCvdChange: Math.round(spotCvdChange), futCvdChange: Math.round(futCvdChange),
        spotToFutRatio: Number(res.spotToFutRatio.toFixed(2)), row,
      };

  return { tile, res, spotCvdChange, priceChange4h };
}

/** Scale-aware $ amount for card text. A flat "$XM" rendered sub-$500K CVD
 *  moves as "$0M" (caught by Playwright QA on On-Chain Insights). */
const M = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e7) return `$${(a / 1e6).toFixed(0)}M`;
  if (a >= 1e6) return `$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(a / 1e3).toFixed(0)}K`;
  return `$${a.toFixed(0)}`;
};

/** Divergence alert card text per verdict (§5 Card Text Templates). */
function alertFor(b: Built, tf: SpotPulseTimeframe): SpotPulseAlert | null {
  const { tile } = b;
  const v = tile.verdict as SpotVerdict;
  const amt = M(b.spotCvdChange);
  switch (v) {
    case 'DISTRIBUTION':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot selling ${amt} in ${tf}`, line2: 'Futures still buying — fake' };
    case 'SPECULATIVE': {
      const futAhead = b.res.spotToFutRatio > 0 ? (1 / b.res.spotToFutRatio).toFixed(1) : '∞';
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Futures ahead ${futAhead}x spot`, line2: 'Move likely to fade' };
    }
    case 'ACCUMULATION':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot buying ${amt} in ${tf}`, line2: 'Price flat — quiet build' };
    case 'REVERSAL SETUP':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot buying ${amt} despite ${b.priceChange4h.toFixed(1)}% move`, line2: 'Floor forming — reversal setup' };
    case 'REAL BUYING':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot leading — ${amt} inflow`, line2: 'Rally has genuine support' };
    default:
      return null;
  }
}

export async function makeSpotPulseLive(
  tier: 'plus' | 'pro',
  tf: SpotPulseTimeframe = '4H',
  extraAssets: string[] = [],
): Promise<SpotPulsePayload> {
  // Row 1 = the 5 fixed anchors. Spot Pulse Pro adds Row 2 = Watchlist Pro's
  // extra coins (Andrew's spec v1.6 ← Rachelle: "Spot Pulse takes the tokens
  // that enter the watchlist") — no need for the tier-locked spot/coins-markets.
  const row2 = tier === 'pro' ? extraAssets.filter((a) => !ANCHORS.includes(a)).slice(0, 5) : [];
  const [built, spotNet] = await Promise.all([
    Promise.all([
      ...ANCHORS.map((a) => buildAsset(a, 1, tf).catch(() => null)),
      ...row2.map((a) => buildAsset(a, 2, tf).catch(() => null)),
    ]).then((xs) => xs.filter((b): b is Built => b !== null)),
    // §6 spot netflow — 1h exchange netflow per symbol (only window CoinGlass exposes).
    // Degrades to null (hidden) if the spot endpoint isn't on the current plan.
    netflowList('spot').catch(() => [] as Awaited<ReturnType<typeof netflowList>>),
  ]);

  // Every anchor failed (or had no CVD on either side) — a total CoinGlass
  // outage, not a genuinely quiet market. Throw rather than return an empty
  // grid that would look like "no signals right now" (matches the live
  // provider's documented "throw on catastrophic failure" convention).
  if (built.length === 0) {
    throw new Error('Spot Pulse data unavailable — all asset fetches failed');
  }

  const tiles = built.map((b) => b.tile);
  const verdicts = tiles.map((t) => t.verdict as SpotVerdict);
  // 10-tile thresholds only when the Pro grid is actually ~10 tiles.
  const marketVerdict = computeMarketVerdict(verdicts, tier === 'pro' && tiles.length >= 8 ? 'pro' : 'plus');

  // Alert cards: top 3 by divergence score (§5).
  const scored = built
    .map((b) => ({ b, score: divergenceScore(b.res, { asset: b.tile.asset, spotCvdChange: b.spotCvdChange, priceChange4h: b.priceChange4h }) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const alerts = scored.slice(0, 3).map((x) => alertFor(x.b, tf)).filter((a): a is SpotPulseAlert => a !== null);

  const netSpotFlow = built.reduce((acc, b) => acc + b.spotCvdChange, 0);

  // Aggregate 1h spot netflow across the tiles we actually rendered (§6).
  let spotNetflow: number | null = null;
  if (spotNet.length) {
    const bySym = new Map(spotNet.map((n) => [n.symbol, Number(n.net_flow_usd_1h) || 0]));
    const withData = built.filter((b) => bySym.has(b.tile.asset));
    if (withData.length) {
      spotNetflow = Math.round(withData.reduce((s, b) => s + (bySym.get(b.tile.asset) ?? 0), 0));
    }
  }

  return {
    tier,
    timeframe: tf,
    marketVerdict,
    marketSentence: MARKET_SENTENCE[marketVerdict], // TODO(ai): LLM one-liner when an Anthropic key exists
    tiles,
    alerts,
    footer: {
      totalSpotVol24h: null, // per-asset spot volume needs spot/coins-markets (tier-locked)
      netSpotFlow: Math.round(netSpotFlow),
      divergenceCount: scored.length,
      spotNetflow,
    },
    updatedAt: nowIso(),
  };
}
