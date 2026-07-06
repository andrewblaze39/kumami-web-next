/**
 * MarketDataProvider interface and factory.
 *
 * Phase 6 will introduce a liveProvider() backed by real API routes.
 * Until then, getProvider() always returns the mock provider.
 *
 * Environment switch shape (for Phase 6):
 *   DATA_PROVIDER=live   → liveProvider()
 *   DATA_PROVIDER=mock   → mockProvider()  (default / current)
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

export interface MarketDataProvider {
  console(): Promise<ConsolePayload>;
  onchain(asset: string, range: '24h' | '7d' | '30d'): Promise<OnChainPayload>;
  heatmap(tier: 'free' | 'pro'): Promise<HeatmapPayload>;
  flowRadar(tier: 'free' | 'pro'): Promise<FlowEvent[]>;
  watchlist(uid: string, tier: 'free' | 'pro'): Promise<WatchlistPayload>;
  intelligence(tier: 'free' | 'pro'): Promise<IntelligencePayload>;
}

export function getProvider(): MarketDataProvider {
  // Phase 6: switch on process.env.DATA_PROVIDER
  // if (process.env.DATA_PROVIDER === 'live') return liveProvider();
  return mockProvider();
}
