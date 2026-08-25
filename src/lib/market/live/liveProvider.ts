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
 * No mock/placeholder path exists: every method returns live data or throws
 * (the route 5xx's and the UI shows a "no data" / error state). The heatmap
 * returns an empty payload because its UI is a static "coming soon" panel.
 *
 * TODO(ai): pro "interpretation" text on panels/briefs — needs an Anthropic key.
 */

import type {
  ConsolePayload, FlowEvent, HeatmapPayload, IntelligencePayload,
  OnChainPayload, WatchlistPayload,
} from '../contracts';
import type { MarketDataProvider } from '../provider';
import { makeConsolePayloadLive } from './console';
import { makeOnChainPayloadLive } from './onchain';
import { makeWatchlistPayloadLive } from './watchlist';
import { makeIntelligencePayloadLive } from './intel';
import { buildFlowEvents } from './flow';

/**
 * Log a live-builder failure and rethrow. We do NOT substitute mock data — a
 * failed live call surfaces as an honest error/empty state in the UI rather
 * than showing placeholder numbers as if they were real. (Individual endpoint
 * failures are already absorbed per-panel inside each builder, so this only
 * fires on a catastrophic failure.)
 */
async function live<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[liveProvider] ${label} failed:`, err);
    throw err;
  }
}

function makeLiveProvider(): MarketDataProvider {
  return {
    async console(): Promise<ConsolePayload> {
      return live('console', makeConsolePayloadLive);
    },

    async onchain(asset: string, range: '24h' | '7d' | '30d'): Promise<OnChainPayload> {
      return live('onchain', () => makeOnChainPayloadLive(asset, range));
    },

    async heatmap(): Promise<HeatmapPayload> {
      // Tier-locked on CoinGlass — the UI renders a static "coming soon" panel,
      // so this returns an empty payload (never fabricated data).
      return { assets: [], capped: false };
    },

    async flowRadar(tier: 'free' | 'pro'): Promise<FlowEvent[]> {
      return live('flowRadar', async () => {
        const events = await buildFlowEvents();
        return tier === 'free' ? events.slice(0, 10) : events;
      });
    },

    async watchlist(uid: string, tier: 'free' | 'pro'): Promise<WatchlistPayload> {
      return live('watchlist', () => makeWatchlistPayloadLive(uid, tier));
    },

    async intelligence(tier: 'free' | 'pro'): Promise<IntelligencePayload> {
      return live('intelligence', () => makeIntelligencePayloadLive(tier));
    },
  };
}

export const liveProvider = makeLiveProvider;
