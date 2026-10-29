/**
 * Kumami's Fear & Greed index (the 5-factor composite) — the ONE index in the product
 * (Rachelle v1.17 Plus §4). The Fear & Greed page, the Console tile and regime, and the
 * collector's daily save all read it through this one cache entry, so they always agree.
 */
import 'server-only';

import type { FearGreedPayload } from './contracts';
import { getCachedFresh } from './cache';
import { getProvider } from './provider';

export const FEAR_GREED_CACHE_KEY = 'market:v2:fear-greed';
export const FEAR_GREED_TTL_SEC = 300;

export function getFearGreedIndex(): Promise<FearGreedPayload> {
  return getCachedFresh(FEAR_GREED_CACHE_KEY, FEAR_GREED_TTL_SEC, () => getProvider().fearGreed());
}
