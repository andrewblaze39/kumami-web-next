/**
 * MarketDataProvider interface and factory.
 *
 * Environment switch:
 *   DATA_PROVIDER=live   → liveProvider() (CoinGlass-backed; falls back to mock
 *                          per-method while endpoints are wired, and entirely if
 *                          no COINGLASS_API_KEY is set)
 *   DATA_PROVIDER=mock    → mockProvider()  (default)
 */

import type {
  ConsolePayload,
  FlowEvent,
  HeatmapPayload,
  IntelligencePayload,
  OnChainPayload,
  WatchlistPayload,
} from './contracts';
import { liveProvider } from './live/liveProvider';
import { coinglassConfigured } from './coinglass/client';

export interface MarketDataProvider {
  console(): Promise<ConsolePayload>;
  onchain(asset: string, range: '24h' | '7d' | '30d'): Promise<OnChainPayload>;
  heatmap(tier: 'free' | 'pro'): Promise<HeatmapPayload>;
  flowRadar(tier: 'free' | 'pro'): Promise<FlowEvent[]>;
  watchlist(uid: string, tier: 'free' | 'pro'): Promise<WatchlistPayload>;
  intelligence(tier: 'free' | 'pro'): Promise<IntelligencePayload>;
}

/**
 * Resolve the market data provider. Always LIVE — there is no mock/placeholder
 * path. If no CoinGlass key is configured, this throws: the route 5xx's and the
 * UI shows a "no data" / error state. The app never serves fabricated data.
 */
export function getProvider(): MarketDataProvider {
  if (!coinglassConfigured()) {
    throw new Error(
      '[market] No live data source configured — set COINGLASS_API_KEY. Refusing to serve placeholder data.',
    );
  }
  return liveProvider();
}
