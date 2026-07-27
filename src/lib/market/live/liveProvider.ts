/**
 * Live MarketDataProvider — backed by CoinGlass v4 (+ CoinGecko for spot, and a
 * small external DXY/S&P source for the Console macro tiles).
 *
 * INCREMENTAL BUILD: every method currently delegates to the mock provider so
 * that flipping DATA_PROVIDER=live is a safe no-op until each endpoint is wired.
 * Replace the delegations one panel at a time, in the doc's priority order, and
 * verify each against a real CoinGlass response before moving on.
 *
 * If no CoinGlass key is configured, we also fall back to mock — so live mode
 * never hard-fails in an environment that hasn't been given a key yet.
 *
 * ── Endpoint wiring checklist (priority order, from the plan) ──────────────
 *   1. watchlist / console price strip  → /api/futures/coins-markets            (single call, cheapest)
 *   2. onchain liquidations + heatmap    → /api/futures/liquidation/aggregated-history
 *                                          /api/futures/liquidation/coin-list
 *                                          /api/futures/liquidation/aggregated-heatmap/model1
 *   3. onchain funding                   → /api/futures/funding-rate/oi-weight-history
 *   4. flowRadar core                    → /api/futures/netflow-list + /api/spot/netflow-list
 *   5. flowRadar whale                   → /api/chain/v2/whale-transfer          (most rate-sensitive; last)
 *   console extras: /api/index/fear-greed-history, /api/etf/bitcoin/flow-history,
 *     /api/futures/global-long-short-account-ratio/history,
 *     /api/futures/open-interest/aggregated-history, + external DXY/S&P (macro tiles)
 *   onchain extras: /api/exchange/balance/{list,chart}, /api/futures/top-long-short-account-ratio/history,
 *     /api/futures/aggregated-cvd/history (+ spot), /api/coinbase-premium-index,
 *     /api/etf/{bitcoin,ethereum}/flow-history, /api/index/stableCoin-marketCap-history
 *   intelligence: /api/article/list, /api/calendar/economic-data, /api/coin/unlock-list (+ Claude briefs)
 *
 * The rule engines in ../rules/* already implement every threshold/verdict — the
 * only work per endpoint is: fetch → shape into the engine's inputs → assemble
 * the existing contract. No rule logic belongs here or in the UI.
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
import { mockProvider } from '../mock/mockProvider';
import { coinglassConfigured } from '../coinglass/client';

function makeLiveProvider(): MarketDataProvider {
  const mock = mockProvider();

  // Until a CoinGlass key is present, behave exactly like mock.
  if (!coinglassConfigured()) {
    return mock;
  }

  return {
    async console(): Promise<ConsolePayload> {
      // TODO(phase2): wire coins-markets + fear-greed + etf-flow + L/S + OI + macro tiles
      return mock.console();
    },

    async onchain(asset: string, range: '24h' | '7d' | '30d'): Promise<OnChainPayload> {
      // TODO(phase2): wire funding / liquidations / netflow / L/S / cvd / premium / etf / oi / stablecoin
      return mock.onchain(asset, range);
    },

    async heatmap(tier: 'free' | 'pro'): Promise<HeatmapPayload> {
      // TODO(phase2): wire /api/futures/liquidation/aggregated-heatmap/model1 (5-asset free cap enforced by gating)
      return mock.heatmap(tier);
    },

    async flowRadar(tier: 'free' | 'pro'): Promise<FlowEvent[]> {
      // TODO(phase2): wire netflow-list (fut+spot) + whale-transfer + large-limit-order + liquidation spikes
      return mock.flowRadar(tier);
    },

    async watchlist(uid: string, tier: 'free' | 'pro'): Promise<WatchlistPayload> {
      // TODO(phase2): wire coins-markets + funding/oi exchange-list + liquidation map + L/S per asset
      return mock.watchlist(uid, tier);
    },

    async intelligence(tier: 'free' | 'pro'): Promise<IntelligencePayload> {
      // TODO(phase2): wire article-list + economic-calendar + unlock-list + Claude briefs
      return mock.intelligence(tier);
    },
  };
}

export const liveProvider = makeLiveProvider;
