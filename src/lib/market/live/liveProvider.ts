/**
 * Live MarketDataProvider — backed by CoinGlass v4.
 *
 * Wiring status (2026-08):
 *   console      → LIVE  (Fear&Greed, ETF, bias, liq24h, regime chips; SPX/DXY coming-soon)
 *   onchain      → LIVE  (9 panels; liquidation heatmap panel = coming-soon, tier-locked)
 *   flowRadar    → LIVE  (whale transfers, netflow flips, liq spikes, HL smart money)
 *   watchlist    → LIVE  (price/funding/long-short → action tags)
 *   intelligence → LIVE  (news + macro calendar + token unlocks)
 *   heatmap      → COMING SOON (aggregated-heatmap/model1 requires a higher CoinGlass plan)
 *
 * Safety: if no CoinGlass key is configured we return the mock provider whole;
 * and each live method falls back to mock on error so a single failing endpoint
 * never takes a page down.
 *
 * TODO(ai): pro "interpretation" text on panels/briefs — needs an Anthropic key.
 */

import type {
  ConsolePayload, FlowEvent, HeatmapPayload, IntelligencePayload,
  OnChainPayload, WatchlistPayload,
} from '../contracts';
import type { MarketDataProvider } from '../provider';
import { mockProvider } from '../mock/mockProvider';
import { coinglassConfigured } from '../coinglass/client';
import { makeConsolePayloadLive } from './console';
import { makeOnChainPayloadLive } from './onchain';
import { makeWatchlistPayloadLive } from './watchlist';
import { makeIntelligencePayloadLive } from './intel';
import { buildFlowEvents } from './flow';

async function withFallback<T>(label: string, live: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await live();
  } catch (err) {
    console.error(`[liveProvider] ${label} failed, using mock:`, err);
    return fallback();
  }
}

function makeLiveProvider(): MarketDataProvider {
  const mock = mockProvider();

  // Until a CoinGlass key is present, behave exactly like mock.
  if (!coinglassConfigured()) {
    return mock;
  }

  return {
    async console(): Promise<ConsolePayload> {
      return withFallback('console', makeConsolePayloadLive, () => mock.console());
    },

    async onchain(asset: string, range: '24h' | '7d' | '30d'): Promise<OnChainPayload> {
      return withFallback('onchain', () => makeOnChainPayloadLive(asset, range), () => mock.onchain(asset, range));
    },

    async heatmap(tier: 'free' | 'pro'): Promise<HeatmapPayload> {
      // Tier-locked on CoinGlass — UI shows a "coming soon" treatment.
      return mock.heatmap(tier);
    },

    async flowRadar(tier: 'free' | 'pro'): Promise<FlowEvent[]> {
      return withFallback('flowRadar', async () => {
        const events = await buildFlowEvents();
        return tier === 'free' ? events.slice(0, 10) : events;
      }, () => mock.flowRadar(tier));
    },

    async watchlist(uid: string, tier: 'free' | 'pro'): Promise<WatchlistPayload> {
      return withFallback('watchlist', () => makeWatchlistPayloadLive(uid, tier), () => mock.watchlist(uid, tier));
    },

    async intelligence(tier: 'free' | 'pro'): Promise<IntelligencePayload> {
      return withFallback('intelligence', () => makeIntelligencePayloadLive(tier), () => mock.intelligence(tier));
    },
  };
}

export const liveProvider = makeLiveProvider;
