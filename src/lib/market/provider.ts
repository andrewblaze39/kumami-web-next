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
import { mockProvider } from './mock/mockProvider';
import { liveProvider } from './live/liveProvider';

export interface MarketDataProvider {
  console(): Promise<ConsolePayload>;
  onchain(asset: string, range: '24h' | '7d' | '30d'): Promise<OnChainPayload>;
  heatmap(tier: 'free' | 'pro'): Promise<HeatmapPayload>;
  flowRadar(tier: 'free' | 'pro'): Promise<FlowEvent[]>;
  watchlist(uid: string, tier: 'free' | 'pro'): Promise<WatchlistPayload>;
  intelligence(tier: 'free' | 'pro'): Promise<IntelligencePayload>;
}

export function getProvider(): MarketDataProvider {
  if (process.env.DATA_PROVIDER === 'live') return liveProvider();
  return mockProvider();
}
