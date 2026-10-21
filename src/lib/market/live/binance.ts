/**
 * Binance public market data (no key). Server-side reads use the market-data host
 * data-api.binance.vision, which isn't region-blocked like api.binance.com.
 */
import 'server-only';

import { getCachedFresh } from '../cache';
import { binanceUsdtVolumes, type BinanceTickerRow } from '../rules/flowLiquidity';

const BASE = 'https://data-api.binance.vision/api/v3';

/** base symbol → 24h USDT-pair quote volume. One ~1 MB call, cached 15 min. */
export function binanceSpotVolumes(): Promise<Record<string, number>> {
  return getCachedFresh('market:v1:binance-vol24h', 900, async () => {
    const res = await fetch(`${BASE}/ticker/24hr?type=MINI`, { cache: 'no-store', signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`Binance ticker HTTP ${res.status}`);
    return binanceUsdtVolumes((await res.json()) as BinanceTickerRow[]);
  });
}
