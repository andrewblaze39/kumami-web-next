/**
 * Live Watchlist payload.
 *
 * Per asset: price/24h change (pairs-markets), funding rate + long/short → the
 * watchlistTags engine for action tags + regime. Liquidation-cluster proximity
 * is tier-locked (heatmap), so priceToLiqPct is passed as Infinity (no tag).
 *
 * Call budget is kept to 3 endpoints/asset (pairs + funding + gls), all cached.
 */

import type { WatchlistPayload, Verdict } from '../contracts';
import { computeWatchlistTags } from '../rules/watchlistTags';
import { fundingOiWeight, globalLongShort, pairsMarkets } from './cg-endpoints';
import { primaryPair, pairSymbol, hasPerp, latestClose, type Dir } from './helpers';

const CURATED = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'AVAX', 'LINK', 'ADA', 'SUI'];

type WlRegime = WatchlistPayload['assets'][number]['regime'];

async function buildAsset(asset: string): Promise<WatchlistPayload['assets'][number] | null> {
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

  return {
    asset,
    price: Number(price.toFixed(price >= 100 ? 2 : 4)),
    change24h: Number(change24h.toFixed(2)),
    regime,
    actionTags: actionTags as Verdict[],
  };
}

export async function makeWatchlistPayloadLive(_uid: string, tier: 'free' | 'pro'): Promise<WatchlistPayload> {
  const slots = tier === 'pro' ? 10 : 4;
  const symbols = CURATED.slice(0, slots);
  const results = await Promise.all(symbols.map((s) => buildAsset(s).catch(() => null)));
  const assets = results.filter((a): a is WatchlistPayload['assets'][number] => a !== null);
  return { slots, assets };
}
