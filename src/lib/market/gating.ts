/**
 * src/lib/market/gating.ts — tier resolution and data-gating helpers.
 *
 * All thresholds are read from environment variables at call time (never
 * hardcoded in client-visible bundles). Defaults:
 *   FREE_TIER_DELAY_MINUTES   = 15  (Flow Radar Plus; Andrew 10 Oct 2026, was 30)
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
import { isProActive } from '@/lib/pro';

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
  return getDelayMinutes() * 60 * 1000;
}

/** Flow Radar Plus delay in minutes (FREE_TIER_DELAY_MINUTES, default 15). */
export function getDelayMinutes(): number {
  const min = Number(process.env.FREE_TIER_DELAY_MINUTES ?? 15);
  return Number.isFinite(min) && min > 0 ? min : 15;
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
 * Resolve the tier for a user — Pro means SUBSCRIBED, nothing else
 * (Andrew, 10 Oct 2026): pro only if `isPremium === true` and any end date
 * set by a superadmin grant (`proUntil`) hasn't passed (lib/pro.ts). Admin/superadmin
 * roles do NOT grant Pro (they control /admin access only); an admin who
 * wants to test Pro turns isPremium on for their own account.
 */
export async function resolveTier(uid: string, deps: GatingDeps = makeFirestoreDeps()): Promise<Tier> {
  const doc = await deps.getUser(uid);
  if (!doc) return 'free';

  if (isProActive(doc as Parameters<typeof isProActive>[0])) return 'pro';

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

/** Which version of a tool the page asked for (?view=plus|pro). */
export type ToolView = 'plus' | 'pro';

/** Parse ?view= — anything other than 'pro' is the Plus view. */
export function parseView(url: string): ToolView {
  return new URL(url).searchParams.get('view') === 'pro' ? 'pro' : 'plus';
}

/**
 * The tier a request is served at (Andrew's spec v1.6): Plus pages always get
 * the cut-down Plus version — even for Pro accounts — and the Pro version
 * requires BOTH the Pro view and a Pro account (enforced server-side, so a
 * non-Pro account can't get Pro data by adding ?view=pro).
 */
export function effectiveTier(view: ToolView, accountTier: Tier): Tier {
  return view === 'pro' && accountTier === 'pro' ? 'pro' : 'free';
}

/**
 * Pick the snapshot to serve a delayed (Plus) feed: the newest snapshot bucket
 * at least `delayMs` old, but not older than `delayMs + maxExtraMs` (stale
 * beyond that is worse than an honest "warming up" state). Returns null when
 * none qualifies. Pure — the Firestore read lives in flowSnapshots.ts.
 */
export function pickSnapshot(buckets: number[], now: number, delayMs: number, maxExtraMs = 10 * 60_000): number | null {
  const newest = now - delayMs;
  const oldest = newest - maxExtraMs;
  const ok = buckets.filter((b) => b <= newest && b >= oldest);
  return ok.length ? Math.max(...ok) : null;
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

/**
 * Cap on user-pinned symbols (Watchlist Pro "Section B — Your Watchlist"),
 * distinct from watchlistSlots() above (which governs the fixed auto/curated
 * table, a different concept). Kumami Pro §2.7 sets this at 15 per list —
 * multiple saved lists (up to 5) are the spec's way of going beyond 15 in
 * aggregate, not a higher single cap; that multi-list feature isn't built
 * yet, so today this is a hard ceiling of 15. Pinning itself is Pro-only —
 * free tier gets 0 (matches the existing isPremium-gated UI).
 */
export function pinCap(tier: Tier): number {
  return tier === 'pro' ? 15 : 0;
}
