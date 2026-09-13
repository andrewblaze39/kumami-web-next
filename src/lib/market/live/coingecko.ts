/**
 * CoinGecko fetchers (server-side only) — free tier, no auth needed.
 *
 * Used for data CoinGlass doesn't cover, e.g. BTC Dominance (Console macro tile,
 * replacing the DXY "coming soon" slot per the Kumami Plus cross-cutting fix).
 */

import { getCached } from '../cache';

const CG_ORIGIN = 'https://api.coingecko.com/api/v3';

type GlobalResponse = {
  data: {
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
};

export type BtcDominance = {
  /** BTC's share of total crypto market cap, 0–100. */
  pct: number;
  /** 24h change in the OVERALL market cap (CoinGecko doesn't expose a per-asset
   *  dominance delta directly, so this approximates the macro tile's "24h change"
   *  as the market-wide cap move; dominance direction itself flips sign of this
   *  when BTC underperforms/outperforms — good enough for a directional macro tile). */
  changePct24h: number;
};

async function fetchBtcDominance(): Promise<BtcDominance> {
  const res = await fetch(`${CG_ORIGIN}/global`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`CoinGecko /global → HTTP ${res.status}`);
  const body = (await res.json()) as GlobalResponse;
  return {
    pct: body.data.market_cap_percentage?.btc ?? 0,
    changePct24h: body.data.market_cap_change_percentage_24h_usd ?? 0,
  };
}

/** Cached 15 min per the doc's refresh cadence for this tile. */
export const btcDominance = () => getCached<BtcDominance>('cg:btc-dominance', 900, fetchBtcDominance);
