/**
 * src/lib/market/cache.ts — generic TTL cache backed by Firestore `market_cache`.
 *
 * NEW collection: `market_cache` (not an existing collection — safe to write to).
 * Doc shape: { value: unknown; updatedAt: number /* Unix ms *\/ }
 *
 * Design goals:
 *  - Testable: injectable `CacheDeps` (get/set/now) default to real Firestore.
 *  - Stampede guard: module-level in-flight Map — only one concurrent fetch per key.
 *  - Error fallback: if fetcher throws and a stale value exists, serve stale (log warn).
 */

import 'server-only';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheEntry {
  value: unknown;
  /** Unix milliseconds */
  updatedAt: number;
}

export interface CacheDeps {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, value: unknown, updatedAt: number): Promise<void>;
  /** Returns current time in Unix ms. Injected so tests can control time. */
  now(): number;
}

// ---------------------------------------------------------------------------
// Module-level stampede guard
// ---------------------------------------------------------------------------

/** In-flight fetcher promises keyed by cache key. */
const _inflight = new Map<string, Promise<unknown>>();

// ---------------------------------------------------------------------------
// Real Firestore deps (default)
// ---------------------------------------------------------------------------

function makeFirestoreDeps(): CacheDeps {
  return {
    async get(key: string): Promise<CacheEntry | null> {
      try {
        // Dynamic import so the module can be tree-shaken for non-server bundles
        // and so tests can avoid loading firebase-admin.
        const { adminDb } = await import('@/lib/firebase-admin');
        const db = adminDb();
        const snap = await db.collection('market_cache').doc(key).get();
        if (!snap.exists) return null;
        const d = snap.data() as CacheEntry;
        return { value: d.value, updatedAt: d.updatedAt };
      } catch {
        return null;
      }
    },
    async set(key: string, value: unknown, updatedAt: number): Promise<void> {
      try {
        const { adminDb } = await import('@/lib/firebase-admin');
        const db = adminDb();
        await db.collection('market_cache').doc(key).set({ value, updatedAt });
      } catch {
        // Non-fatal — cache write failure should not surface to callers.
      }
    },
    now: () => Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Retrieve `key` from cache. If fresh (age < ttlSec), return the cached value.
 * If stale or missing, call `fetcher`, persist the result, and return it.
 *
 * @param key     Cache key (becomes Firestore doc id in `market_cache`).
 * @param ttlSec  Seconds before an entry is considered stale.
 * @param fetcher Async function to re-fetch fresh data.
 * @param deps    Optional injectable deps for testing. Defaults to real Firestore.
 */
export async function getCached<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
  deps: CacheDeps = makeFirestoreDeps(),
): Promise<T> {
  return _getCached(key, ttlSec, fetcher, deps, true);
}

/**
 * Like {@link getCached}, but NEVER serves a stale value. On a fresh hit it
 * returns the cached (real) value; on a miss/stale it awaits a fresh fetch
 * (de-duplicated across concurrent callers); on fetcher error it throws.
 *
 * Used for the user-facing market payloads so the app only ever renders real,
 * current data or a loading/error state — never stale or placeholder data.
 */
export async function getCachedFresh<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
  deps: CacheDeps = makeFirestoreDeps(),
): Promise<T> {
  return _getCached(key, ttlSec, fetcher, deps, false);
}

async function _getCached<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
  deps: CacheDeps,
  serveStale: boolean,
): Promise<T> {
  const nowMs = deps.now();
  const entry = await deps.get(key);

  // Fresh hit — return immediately (real value within TTL).
  if (entry !== null && nowMs - entry.updatedAt < ttlSec * 1000) {
    return entry.value as T;
  }

  // Stale or missing — dedupe against any in-flight fetch for this key.
  if (_inflight.has(key)) {
    // serveStale: return the old value immediately; otherwise wait for fresh.
    if (serveStale && entry !== null) {
      return entry.value as T;
    }
    return _inflight.get(key) as Promise<T>;
  }

  // Start a new fetch and register it in the in-flight map.
  const fetchPromise = (async (): Promise<T> => {
    try {
      const fresh = await fetcher();
      await deps.set(key, fresh, deps.now());
      return fresh;
    } catch (err) {
      if (serveStale && entry !== null) {
        console.warn(
          `[market/cache] fetcher for "${key}" threw — serving stale value. Error:`,
          err,
        );
        return entry.value as T;
      }
      throw err;
    } finally {
      _inflight.delete(key);
    }
  })();

  _inflight.set(key, fetchPromise);
  return fetchPromise;
}
