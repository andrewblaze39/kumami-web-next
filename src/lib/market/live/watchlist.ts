/**
 * Live Watchlist payload.
 *
 * Per asset: price/24h change (pairs-markets), funding rate + long/short → the
 * watchlistTags engine for action tags + regime. Liquidation-cluster proximity
 * is tier-locked (heatmap), so priceToLiqPct is passed as Infinity (no tag).
 *
 * Call budget is kept to 3 endpoints/asset (pairs + funding + gls), all cached.
 *
 * Curated roster is the same fixed 5-asset universe used everywhere else on
 * Plus (Console, Fear & Greed, Spot Pulse, Calendar) — per PM spec.
 */

import type { WatchlistPayload, Verdict } from '../contracts';
import { computeWatchlistTags } from '../rules/watchlistTags';
import { computePrimarySignal } from '../rules/watchlistSignal';
import { fundingOiWeight, globalLongShort, pairsMarkets } from './cg-endpoints';
import { primaryPair, pairSymbol, hasPerp, latestClose, type Dir } from './helpers';

const CURATED = ['BTC', 'ETH', 'SOL', 'BNB', 'HYPE'];

type WlRegime = WatchlistPayload['assets'][number]['regime'];

/** Cross-engine inputs for the Signal column — all optional so callers that
 *  can't afford the extra fetches (or are on a code path without the shared
 *  Flow Radar/Spot Pulse reads) still get a sensible "Quiet" fallback. */
export type SignalInputs = {
  whale?: { bullish: number; bearish: number; bullishUsd: number; bearishUsd: number };
  smartMoney?: { bullish: number; bearish: number };
  spotPulse?: { verdict: string; priceChange4h: number };
};

export async function buildAsset(
  asset: string,
  signalInputs?: SignalInputs,
): Promise<WatchlistPayload['assets'][number] | null> {
  const perp = hasPerp(asset);
  const [pairs, funding, gls] = await Promise.all([
    pairsMarkets(asset).catch(() => []),
    fundingOiWeight(asset, '1h').catch(() => []),
    perp ? globalLongShort(pairSymbol(asset), '1h').catch(() => []) : Promise.resolve([]),
  ]);
  const primary = primaryPair(pairs);
  if (!primary) return null;

  const price = primary.current_price;
  const change24h = primary.price_change_percent_24h;
  const fundingRate = latestClose(funding); // decimal fraction (0.0004 = 0.04%)
  const pctLong = gls.length ? gls[gls.length - 1].global_account_long_percent : 50;
  const priceDir: Dir = change24h > 0.5 ? 'up' : change24h < -0.5 ? 'down' : 'flat';

  const { actionTags, regimeTag } = computeWatchlistTags({
    fundingRate,
    priceToLiqPct: Infinity, // liq clusters tier-locked
    pctLong,
    oiDirection: priceDir, // OI history omitted to cap call budget; approximate with price
    priceDirection: priceDir,
    isLowOiLowVolume: Math.abs(change24h) < 0.5,
  });

  const regime = (['Trending Up', 'Trending Down', 'Coiling', 'Ranging'] as const).includes(regimeTag.label as WlRegime)
    ? (regimeTag.label as WlRegime)
    : 'Ranging';

  const primarySignal = computePrimarySignal({
    whaleBullishCount: signalInputs?.whale?.bullish ?? 0,
    whaleBearishCount: signalInputs?.whale?.bearish ?? 0,
    whaleBullishUsd: signalInputs?.whale?.bullishUsd ?? 0,
    whaleBearishUsd: signalInputs?.whale?.bearishUsd ?? 0,
    smartMoneyBullishCount: signalInputs?.smartMoney?.bullish ?? 0,
    smartMoneyBearishCount: signalInputs?.smartMoney?.bearish ?? 0,
    spotPulseVerdict: signalInputs?.spotPulse?.verdict,
    spotPulsePriceChange4h: signalInputs?.spotPulse?.priceChange4h,
  });

  return {
    asset,
    price: Number(price.toFixed(price >= 100 ? 2 : 4)),
    change24h: Number(change24h.toFixed(2)),
    regime,
    actionTags: actionTags as Verdict[],
    primarySignal,
  };
}

export async function makeWatchlistPayloadLive(_uid: string, tier: 'free' | 'pro'): Promise<WatchlistPayload> {
  const slots = tier === 'pro' ? CURATED.length : Math.min(4, CURATED.length);
  const symbols = CURATED.slice(0, slots);
  const results = await Promise.all(symbols.map((s) => buildAsset(s).catch(() => null)));
  const assets = results.filter((a): a is WatchlistPayload['assets'][number] => a !== null);
  return { slots, assets };
}
