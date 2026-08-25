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
 * Resolve the market data provider.
 *
 * Policy (never silently serve mock in the running app):
 *   - DATA_PROVIDER=mock          → mock provider (explicit local-dev / test opt-in only).
 *   - a CoinGlass key is present  → LIVE provider (regardless of DATA_PROVIDER).
 *   - otherwise                   → throw. Misconfiguration surfaces as a loud error
 *                                    (the route 5xx's and the UI shows an error state),
 *                                    never as believable placeholder data.
 */
export function getProvider(): MarketDataProvider {
  if (process.env.DATA_PROVIDER === 'mock') return mockProvider();
  if (coinglassConfigured()) return liveProvider();
  throw new Error(
    '[market] No live data source configured. Set COINGLASS_API_KEY for live data, ' +
      'or DATA_PROVIDER=mock for local development. Refusing to serve placeholder data.',
  );
}
