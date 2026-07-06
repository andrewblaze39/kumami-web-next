/**
 * Mock implementation of MarketDataProvider.
 * Delegates to fixture factories seeded per hour for stable-but-alive data.
 */

import type {
  ConsolePayload,
  FlowEvent,
  HeatmapPayload,
  IntelligencePayload,
  OnChainPayload,
  WatchlistPayload,
} from '../contracts';
import type { MarketDataProvider } from '../provider';
import { createFixtures } from './fixtures';

function makeProvider(): MarketDataProvider {
  return {
    async console(): Promise<ConsolePayload> {
      return createFixtures().makeConsolePayload();
    },

    async onchain(asset: string, range: '24h' | '7d' | '30d'): Promise<OnChainPayload> {
      return createFixtures().makeOnChainPayload(asset, range);
    },

    async heatmap(tier: 'free' | 'pro'): Promise<HeatmapPayload> {
      return createFixtures().makeHeatmapPayload(tier);
    },

    async flowRadar(tier: 'free' | 'pro'): Promise<FlowEvent[]> {
      const events = createFixtures().makeFlowEvents(12);
      // Free tier: last 6; Pro: all 12
      return tier === 'free' ? events.slice(0, 6) : events;
    },

    async watchlist(uid: string, tier: 'free' | 'pro'): Promise<WatchlistPayload> {
      return createFixtures().makeWatchlistPayload(uid, tier);
    },

    async intelligence(tier: 'free' | 'pro'): Promise<IntelligencePayload> {
      return createFixtures().makeIntelligencePayload(tier);
    },
  };
}

export const mockProvider = makeProvider;
