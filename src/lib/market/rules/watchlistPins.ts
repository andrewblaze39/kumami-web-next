/**
 * Watchlist Pro Section B — which coins can be pinned (Rachelle v1.15 Pro §19).
 *
 *   - up to 15 pins (enforced by userWatchlist.addSymbol)
 *   - needs a spot market with ≥ $10M 24h volume AND a futures market
 *     (both read from the cached spot / futures netflow-lists)
 *   - stablecoins, wrapped/staked tokens and the 5 core assets can't be pinned
 *   - otherwise: "Not enough liquidity to track reliably."
 */

import { ANCHOR_ASSETS, STABLECOINS } from './consistentFlow';

export const PIN_MIN_SPOT_VOLUME_24H = 10_000_000;

export type PinCheck =
  | { ok: true }
  | { ok: false; code: 'invalid_symbol' | 'core_asset' | 'not_allowed' | 'illiquid'; message: string };

export type PinMarkets = {
  /** symbol → 24h spot volume (taker buy + sell). */
  spotVolume: Map<string, number>;
  /** symbols with a futures market. */
  futures: Set<string>;
};

export function checkPin(symbolRaw: string, markets: PinMarkets): PinCheck {
  const symbol = symbolRaw.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(symbol)) {
    return { ok: false, code: 'invalid_symbol', message: `"${symbolRaw}" isn't a ticker.` };
  }
  if (ANCHOR_ASSETS.includes(symbol)) {
    return { ok: false, code: 'core_asset', message: `${symbol} is a core asset — it's always in Section A.` };
  }
  if (STABLECOINS.includes(symbol)) {
    return { ok: false, code: 'not_allowed', message: "Stablecoins and wrapped tokens can't be pinned." };
  }
  if ((markets.spotVolume.get(symbol) ?? 0) < PIN_MIN_SPOT_VOLUME_24H || !markets.futures.has(symbol)) {
    return { ok: false, code: 'illiquid', message: 'Not enough liquidity to track reliably.' };
  }
  return { ok: true };
}
