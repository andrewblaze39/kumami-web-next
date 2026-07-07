/**
 * src/lib/market/gating.ts — tier resolution and data-gating helpers.
 *
 * All thresholds are read from environment variables at call time (never
 * hardcoded in client-visible bundles). Defaults:
 *   FREE_TIER_DELAY_MINUTES   = 30
 *   FREE_HEATMAP_ASSET_CAP    = 5
 *   FREE_WATCHLIST_SLOTS      = 5
 *
 * Pro watchlist slots: the PM reference doc describes pro watchlist as
 * "live/unlimited" (line 66) but does not specify a numeric cap. We use
 * Infinity so callers can do a simple numeric comparison. If a specific cap
 * is later decided, change only this constant.
 */

import 'server-only';

import type { FlowEvent } from './contracts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tier = 'free' | 'pro';

/** Injectable deps for unit-testing without real Firestore. */
export interface GatingDeps {
  /** Returns the Firestore users/{uid} document data, or null if missing. */
  getUser(uid: string): Promise<Record<string, unknown> | null>;
}

// ---------------------------------------------------------------------------
// Real Firestore deps (default)
// ---------------------------------------------------------------------------

function makeFirestoreDeps(): GatingDeps {
  return {
    async getUser(uid: string): Promise<Record<string, unknown> | null> {
      try {
        const { adminDb } = await import('@/lib/firebase-admin');
        const db = adminDb();
        const snap = await db.collection('users').doc(uid).get();
        if (!snap.exists) return null;
        return snap.data() as Record<string, unknown>;
      } catch {
        return null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Env var helpers — read at call time, never at module load
// ---------------------------------------------------------------------------

function getDelayMs(): number {
  const min = Number(process.env.FREE_TIER_DELAY_MINUTES ?? 30);
  return (Number.isFinite(min) && min > 0 ? min : 30) * 60 * 1000;
}

function getHeatmapCap(): number {
  const cap = Number(process.env.FREE_HEATMAP_ASSET_CAP ?? 5);
  return Number.isFinite(cap) && cap > 0 ? cap : 5;
}

function getFreeWatchlistSlots(): number {
  const slots = Number(process.env.FREE_WATCHLIST_SLOTS ?? 5);
  return Number.isFinite(slots) && slots > 0 ? slots : 5;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the tier for a user.
 *   - pro if `isPremium === true`
 *   - pro if `role` is 'admin' or 'superadmin'
 *   - free otherwise (including missing document)
 */
export async function resolveTier(uid: string, deps: GatingDeps = makeFirestoreDeps()): Promise<Tier> {
  const doc = await deps.getUser(uid);
  if (!doc) return 'free';

  if (doc.isPremium === true) return 'pro';
  if (doc.role === 'admin' || doc.role === 'superadmin') return 'pro';

  return 'free';
}

/**
 * Filter Flow Radar events based on tier.
 *   - pro: all events pass through.
 *   - free: only events at least FREE_TIER_DELAY_MINUTES old are returned.
 *
 * @param events  Array of FlowEvent (each has a `ts` ISO string).
 * @param tier    User tier.
 * @param now     Current time in Unix ms (defaults to Date.now()). Injectable for tests.
 */
export function applyDelay(events: FlowEvent[], tier: Tier, now: number = Date.now()): FlowEvent[] {
  if (tier === 'pro') return events;
  const delayMs = getDelayMs();
  return events.filter((e) => now - new Date(e.ts).getTime() >= delayMs);
}

/**
 * Cap the length of a list to the free-tier asset cap.
 *   - pro: full list.
 *   - free: slice(0, FREE_HEATMAP_ASSET_CAP).
 */
export function capAssets<T>(list: T[], tier: Tier): T[] {
  if (tier === 'pro') return list;
  return list.slice(0, getHeatmapCap());
}

/**
 * Returns the number of watchlist slots for the given tier.
 *   - free: FREE_WATCHLIST_SLOTS (default 5).
 *   - pro: Infinity — the PM doc describes pro as "live/unlimited" (ref doc line 66)
 *          but specifies no numeric cap. Use Infinity so callers can compare freely.
 */
export function watchlistSlots(tier: Tier): number {
  if (tier === 'pro') return Infinity;
  return getFreeWatchlistSlots();
}
