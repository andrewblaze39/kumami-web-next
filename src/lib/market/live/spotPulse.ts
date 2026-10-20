/**
 * Spot Pulse builder — Rachelle v1.15 Plus §2.9 (Plus tile, Console preview and
 * Spot Pulse Pro share it).
 *
 * Data, three calls per coin, 1H bars × 2016 (84 days) — one fetch per coin
 * serves all three timeframes:
 *   /api/spot/aggregated-cvd/history     exchange_list = Binance,OKX,Coinbase,Bybit,Bitget
 *   /api/futures/aggregated-cvd/history  exchange_list = Binance,OKX,Bybit,Bitget,Hyperliquid
 *   /api/futures/price/history           Binance <COIN>USDT
 * Per bar flow = taker buy − taker sell. Timestamps are normalised (s or ms).
 *
 * Footer 24h spot volume = taker buy + sell from /api/spot/netflow-list (on our
 * plan — coins-markets isn't needed). The engine is in rules/spotPulse.ts.
 */

import type { SpotPulsePayload, SpotPulseTile, SpotPulseAlert } from '../contracts';
import {
  computeSpotVerdict,
  computeMarketVerdict,
  divergenceScore,
  windowStats,
  MARKET_SENTENCE,
  WINDOW_BARS,
  type SpotTimeframe,
  type SpotVerdict,
  type SpotVerdictResult,
} from '../rules/spotPulse';
import { cvdHourly, priceHourly, netflowList, type CvdRow, type OHLC } from './cg-endpoints';
import { pairSymbol, nowIso } from './helpers';

const ANCHORS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

export type SpotPulseTimeframe = SpotTimeframe;

const toMs = (t: number) => (t < 1e12 ? t * 1000 : t);
/** Per-bar flow = aggressive taker buy − sell. */
const barFlow = (r: CvdRow) => (Number(r.agg_taker_buy_vol) || 0) - (Number(r.agg_taker_sell_vol) || 0);

/** Oldest → newest, de-duplicated by hour. */
function byHour<T extends { time: number }>(rows: T[]): T[] {
  const m = new Map<number, T>();
  for (const r of rows) m.set(Math.floor(toMs(Number(r.time)) / 3_600_000), r);
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);
}

type Built = {
  tile: SpotPulseTile;
  res: SpotVerdictResult;
  spotDelta: number;
  priceChangePct: number;
};

async function buildAsset(asset: string, row: 1 | 2, tf: SpotPulseTimeframe, source?: SpotPulseTile['source']): Promise<Built | null> {
  // null (not []) = the fetch failed — must never feed a fake 0 into a tile.
  const [spotRaw, futRaw, priceRaw] = await Promise.all([
    cvdHourly('spot', asset).catch(() => null as CvdRow[] | null),
    cvdHourly('futures', asset).catch(() => null as CvdRow[] | null),
    priceHourly(pairSymbol(asset)).catch(() => null as OHLC[] | null),
  ]);
  const spot = byHour(spotRaw ?? []);
  const fut = byHour(futRaw ?? []);
  const prices = byHour(priceRaw ?? []);
  if (!spot.length && !fut.length) return null; // no CVD on either side → no tile (§11)

  const s = windowStats(spot.map(barFlow), tf);
  const f = windowStats(fut.map(barFlow), tf);
  const n = WINDOW_BARS[tf];
  let priceChangePct = 0;
  if (prices.length > n) {
    const c1 = Number(prices[prices.length - 1].close);
    const c0 = Number(prices[prices.length - 1 - n].close);
    priceChangePct = c0 ? ((c1 - c0) / c0) * 100 : 0;
  }

  const res = computeSpotVerdict({
    timeframe: tf, priceChangePct, spotDelta: s.delta, futDelta: f.delta,
    spotSwing: s.swing, futSwing: f.swing, pastWindows: s.pastWindows,
  });
  // Missing spot side, or a failed futures/price fetch → "NO DATA" tile, never a fake flat read.
  const insufficient = !spot.length || futRaw === null || priceRaw === null || prices.length <= n;

  const common = {
    asset, row, ...(source ? { source } : {}),
    priceChange4h: Number(priceChangePct.toFixed(2)),
    spotCvdChange: Math.round(s.delta), futCvdChange: Math.round(f.delta),
  };
  const tile: SpotPulseTile = insufficient
    ? { ...common, verdict: 'BALANCED', color: 'rgba(120,200,170,0.15)', glow: false, spotToFutRatio: 0, insufficient: true }
    : {
        ...common, verdict: res.verdict, color: res.color, glow: res.glow,
        spotToFutRatio: Number(res.spotToFutRatio.toFixed(2)),
        ...(res.notEnoughHistory ? { notEnoughHistory: true } : {}),
      };
  return { tile, res, spotDelta: s.delta, priceChangePct };
}

/** Scale-aware $ amount for card text (sub-$500K moves once rendered as "$0M"). */
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
  const amt = M(b.spotDelta);
  switch (v) {
    case 'DISTRIBUTION':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot selling ${amt} in ${tf}`, line2: 'Futures still buying — fake' };
    case 'QUIET DISTRIBUTION':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot selling ${amt} in ${tf}`, line2: 'Price flat — quiet exit' };
    case 'SPECULATIVE': {
      const futAhead = b.res.spotToFutRatio > 0 ? (1 / b.res.spotToFutRatio).toFixed(1) : '∞';
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Futures ahead ${futAhead}x spot`, line2: 'Move likely to fade' };
    }
    case 'ACCUMULATION':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot buying ${amt} in ${tf}`, line2: 'Price flat — quiet build' };
    case 'REVERSAL SETUP':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot buying ${amt} despite ${b.priceChangePct.toFixed(1)}% move`, line2: 'Floor forming — reversal setup' };
    case 'REAL BUYING':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot leading — ${amt} inflow`, line2: 'Rally has genuine support' };
    default:
      return null;
  }
}

/**
 * @param extraAssets Spot Pulse Pro row 2: the Watchlist Pro "Also Worth Watching" coins.
 * @param topVolume   coins to fill row 2's empty slots, labelled "Top volume".
 */
export async function makeSpotPulseLive(
  tier: 'plus' | 'pro',
  tf: SpotPulseTimeframe = '4H',
  extraAssets: string[] = [],
  topVolume: string[] = [],
): Promise<SpotPulsePayload> {
  const watch = tier === 'pro' ? extraAssets.filter((a) => !ANCHORS.includes(a)).slice(0, 5) : [];
  const fill = tier === 'pro' ? topVolume.filter((a) => !ANCHORS.includes(a) && !watch.includes(a)).slice(0, 5 - watch.length) : [];
  const [built, spotNet] = await Promise.all([
    Promise.all([
      ...ANCHORS.map((a) => buildAsset(a, 1, tf).catch(() => null)),
      ...watch.map((a) => buildAsset(a, 2, tf, 'watchlist').catch(() => null)),
      ...fill.map((a) => buildAsset(a, 2, tf, 'top-volume').catch(() => null)),
    ]).then((xs) => xs.filter((b): b is Built => b !== null)),
    netflowList('spot').catch(() => [] as Awaited<ReturnType<typeof netflowList>>),
  ]);

  // Every coin failed — an outage, not a quiet market: throw instead of an empty grid.
  if (built.length === 0) throw new Error('Spot Pulse data unavailable — all asset fetches failed');

  const tiles = built.map((b) => b.tile);
  // Market verdict on tiles with data only (no NO DATA, no "not enough history").
  const withData = tiles.filter((t) => !t.insufficient && !t.notEnoughHistory);
  const marketVerdict = computeMarketVerdict(withData.map((t) => t.verdict as SpotVerdict));

  const scored = built
    .filter((b) => !b.tile.insufficient && !b.tile.notEnoughHistory)
    .map((b) => ({ b, score: divergenceScore(b.res, { asset: b.tile.asset, spotDelta: b.spotDelta, priceChangePct: b.priceChangePct, isDynamicRow2: b.tile.row === 2 }) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const alerts = scored.slice(0, 3).map((x) => alertFor(x.b, tf)).filter((a): a is SpotPulseAlert => a !== null);

  const netSpotFlow = built.reduce((acc, b) => acc + (b.tile.insufficient ? 0 : b.spotDelta), 0);

  // Footer: 24h spot volume (taker buy + sell) and 1h spot netflow across the rendered tiles.
  let spotNetflow: number | null = null;
  let totalSpotVol24h: number | null = null;
  if (spotNet.length) {
    const bySym = new Map(spotNet.map((r) => [r.symbol, r]));
    const rows = tiles.map((t) => bySym.get(t.asset)).filter((r): r is NonNullable<typeof r> => !!r);
    if (rows.length) {
      spotNetflow = Math.round(rows.reduce((s, r) => s + (Number(r.net_flow_usd_1h) || 0), 0));
      totalSpotVol24h = Math.round(rows.reduce((s, r) => s + (Number(r.taker_buy_volume_usd_24h) || 0) + (Number(r.taker_sell_volume_usd_24h) || 0), 0));
    }
  }

  return {
    tier,
    timeframe: tf,
    marketVerdict,
    marketSentence: MARKET_SENTENCE[marketVerdict],
    tiles,
    alerts,
    footer: {
      totalSpotVol24h,
      netSpotFlow: Math.round(netSpotFlow),
      divergenceCount: scored.length,
      spotNetflow,
    },
    updatedAt: nowIso(),
  };
}
