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
  // mockProvider is used ONLY for the tier-locked heatmap payload (rendered as a
  // "coming soon" panel, never as real data). getProvider() guarantees a key
  // before this runs, so no live method ever falls back to mock.
  const mock = mockProvider();

  return {
    async console(): Promise<ConsolePayload> {
      return live('console', makeConsolePayloadLive);
    },

    async onchain(asset: string, range: '24h' | '7d' | '30d'): Promise<OnChainPayload> {
      return live('onchain', () => makeOnChainPayloadLive(asset, range));
    },

    async heatmap(tier: 'free' | 'pro'): Promise<HeatmapPayload> {
      // Tier-locked on CoinGlass — the UI shows an honest "coming soon" panel,
      // so this payload is never rendered as real data.
      return mock.heatmap(tier);
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
