/**
 * src/lib/market/userWatchlist.ts — curated watchlist CRUD logic.
 *
 * Manages the `watchlists/{uid}` Firestore document which holds a user's
 * manually curated list of symbols:
 *   { symbols: string[] }
 *
 * Injectable deps for unit-testing without real Firestore.
 *
 * Symbol allowlist — must match the 10-asset pool used by the mock provider
 * and the On-Chain page. Validation is server-side only; the client sends
 * symbols from the same list so errors are a safeguard, not a UX flow.
 */

import 'server-only';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ALLOWED_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE', 'LINK', 'APT', 'SUI',
] as const;

export type AllowedSymbol = (typeof ALLOWED_SYMBOLS)[number];

// ---------------------------------------------------------------------------
// Dep interface (injectable for tests)
// ---------------------------------------------------------------------------

export interface WatchlistDeps {
  /** Read the curated symbol list for a user ([] if document missing). */
  getSymbols(uid: string): Promise<string[]>;
  /** Persist the curated symbol list for a user. */
  setSymbols(uid: string, symbols: string[]): Promise<void>;
}

// ---------------------------------------------------------------------------
// Default Firestore deps
// ---------------------------------------------------------------------------

function makeFirestoreDeps(): WatchlistDeps {
  return {
    async getSymbols(uid: string): Promise<string[]> {
      const { adminDb } = await import('@/lib/firebase-admin');
      const db = adminDb();
      const snap = await db.collection('watchlists').doc(uid).get();
      if (!snap.exists) return [];
      const data = snap.data();
      const symbols = data?.symbols;
      return Array.isArray(symbols) ? (symbols as string[]) : [];
    },
    async setSymbols(uid: string, symbols: string[]): Promise<void> {
      const { adminDb } = await import('@/lib/firebase-admin');
      const db = adminDb();
      await db.collection('watchlists').doc(uid).set({ symbols }, { merge: false });
    },
  };
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type WatchlistError =
  | { code: 'slots_exceeded'; message: string }
  | { code: 'invalid_symbol'; message: string };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the curated symbol list for a user.
 */
export async function getCuratedSymbols(
  uid: string,
  deps: WatchlistDeps = makeFirestoreDeps(),
): Promise<string[]> {
  return deps.getSymbols(uid);
}

/**
 * Add a symbol to the user's curated watchlist.
 *
 * Returns the updated list on success, or a WatchlistError if:
 *   - symbol is not in the allowlist → code: 'invalid_symbol'
 *   - adding would exceed `maxSlots` → code: 'slots_exceeded'
 * Deduplicates silently (adding existing symbol is a no-op, returns current list).
 */
export async function addSymbol(
  uid: string,
  symbol: string,
  maxSlots: number,
  deps: WatchlistDeps = makeFirestoreDeps(),
): Promise<string[] | WatchlistError> {
  // Validate symbol
  if (!(ALLOWED_SYMBOLS as readonly string[]).includes(symbol)) {
    return { code: 'invalid_symbol', message: `Symbol "${symbol}" is not in the allowed list.` };
  }

  const current = await deps.getSymbols(uid);

  // Deduplicate: already present → no-op
  if (current.includes(symbol)) {
    return current;
  }

  // Slot check (Infinity = unlimited for pro)
  if (Number.isFinite(maxSlots) && current.length >= maxSlots) {
    return { code: 'slots_exceeded', message: `Watchlist is full (${maxSlots} slots).` };
  }

  const updated = [...current, symbol];
  await deps.setSymbols(uid, updated);
  return updated;
}

/**
 * Remove a symbol from the user's curated watchlist.
 * Removing a non-existent symbol is a no-op.
 */
export async function removeSymbol(
  uid: string,
  symbol: string,
  deps: WatchlistDeps = makeFirestoreDeps(),
): Promise<string[]> {
  const current = await deps.getSymbols(uid);
  const updated = current.filter(s => s !== symbol);
  if (updated.length !== current.length) {
    await deps.setSymbols(uid, updated);
  }
  return updated;
}
