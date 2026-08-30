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
import { cvdHistory, priceHistory, type CvdRow } from './cg-endpoints';
import { pairSymbol, nowIso } from './helpers';

const ANCHORS = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

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

async function buildAsset(asset: string, row: 1 | 2): Promise<Built | null> {
  const pair = pairSymbol(asset);
  const [spotCvd, futCvd, priceRows] = await Promise.all([
    cvdHistory('spot', asset, '4h').catch(() => [] as CvdRow[]),
    cvdHistory('futures', asset, '4h').catch(() => [] as CvdRow[]),
    priceHistory(pair, '4h').catch(() => []),
  ]);

  // No CVD at all on either side → skip the tile entirely (§11).
  if (!spotCvd.length && !futCvd.length) return null;

  const spotCvdChange = spotCvd.length ? barDelta(spotCvd[spotCvd.length - 1]) : 0;
  const futCvdChange = futCvd.length ? barDelta(futCvd[futCvd.length - 1]) : 0;
  const spotCvdRange = stddev(spotCvd.slice(-42).map(barDelta));
  const futCvdRange = stddev(futCvd.slice(-42).map(barDelta));

  let priceChange4h = 0;
  if (priceRows.length >= 2) {
    const c1 = Number(priceRows[priceRows.length - 1].close);
    const c0 = Number(priceRows[priceRows.length - 2].close);
    priceChange4h = c0 ? ((c1 - c0) / c0) * 100 : 0;
  }

  const res = computeSpotVerdict({ priceChange4h, spotCvdChange, futCvdChange, spotCvdRange, futCvdRange });
  const insufficient = !spotCvd.length; // spot side is what makes the verdict meaningful

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

const M = (v: number) => `$${Math.abs(v / 1e6).toFixed(0)}M`;

/** Divergence alert card text per verdict (§5 Card Text Templates). */
function alertFor(b: Built): SpotPulseAlert | null {
  const { tile } = b;
  const v = tile.verdict as SpotVerdict;
  const amt = M(b.spotCvdChange);
  switch (v) {
    case 'DISTRIBUTION':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot selling ${amt} in 4H`, line2: 'Futures still buying — fake' };
    case 'SPECULATIVE': {
      const futAhead = b.res.spotToFutRatio > 0 ? (1 / b.res.spotToFutRatio).toFixed(1) : '∞';
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Futures ahead ${futAhead}x spot`, line2: 'Move likely to fade' };
    }
    case 'ACCUMULATION':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot buying ${amt} in 4H`, line2: 'Price flat — quiet build' };
    case 'REVERSAL SETUP':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot buying ${amt} despite ${b.priceChange4h.toFixed(1)}% move`, line2: 'Floor forming — reversal setup' };
    case 'REAL BUYING':
      return { asset: tile.asset, verdict: v, color: tile.color, line1: `Spot leading — ${amt} inflow`, line2: 'Rally has genuine support' };
    default:
      return null;
  }
}

export async function makeSpotPulseLive(tier: 'plus' | 'pro'): Promise<SpotPulsePayload> {
  // Pro Row-2 (dynamic trending) needs /api/spot/coins-markets which is tier-locked,
  // so both tiers currently render the 5 fixed anchors. Row-2 fills in on a plan upgrade.
  const built = (await Promise.all(ANCHORS.map((a) => buildAsset(a, 1).catch(() => null)))).filter(
    (b): b is Built => b !== null,
  );

  const tiles = built.map((b) => b.tile);
  const verdicts = tiles.map((t) => t.verdict as SpotVerdict);
  const marketVerdict = computeMarketVerdict(verdicts, tier);

  // Alert cards: top 3 by divergence score (§5).
  const scored = built
    .map((b) => ({ b, score: divergenceScore(b.res, { asset: b.tile.asset, spotCvdChange: b.spotCvdChange, priceChange4h: b.priceChange4h }) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const alerts = scored.slice(0, 3).map((x) => alertFor(x.b)).filter((a): a is SpotPulseAlert => a !== null);

  const netSpotFlow = built.reduce((acc, b) => acc + b.spotCvdChange, 0);

  return {
    tier,
    timeframe: '4H',
    marketVerdict,
    marketSentence: MARKET_SENTENCE[marketVerdict], // TODO(ai): LLM one-liner when an Anthropic key exists
    tiles,
    alerts,
    footer: {
      totalSpotVol24h: null, // per-asset spot volume needs spot/coins-markets (tier-locked)
      netSpotFlow: Math.round(netSpotFlow),
      divergenceCount: scored.length,
    },
    updatedAt: nowIso(),
  };
}
