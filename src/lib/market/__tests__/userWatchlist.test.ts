/**
 * Tests for src/lib/market/userWatchlist.ts
 * Pure logic — injectable deps, no real Firestore.
 */

import { describe, it, expect } from 'vitest';
import {
  addSymbol,
  removeSymbol,
  getCuratedSymbols,
  ALLOWED_SYMBOLS,
  type WatchlistDeps,
} from '../userWatchlist';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** In-memory fake Firestore store for tests. */
function makeDeps(initial: string[] = []): WatchlistDeps & { store: Map<string, string[]> } {
  const store = new Map<string, string[]>();
  store.set('uid', [...initial]);
  return {
    store,
    async getSymbols(uid: string) {
      return [...(store.get(uid) ?? [])];
    },
    async setSymbols(uid: string, symbols: string[]) {
      store.set(uid, [...symbols]);
    },
  };
}

const FREE_SLOTS = 5;
const PRO_SLOTS = Infinity;

// ---------------------------------------------------------------------------
// getCuratedSymbols
// ---------------------------------------------------------------------------

describe('getCuratedSymbols', () => {
  it('returns empty array when no document exists', async () => {
    const deps = makeDeps();
    deps.store.delete('uid');
    const result = await getCuratedSymbols('uid', deps);
    expect(result).toEqual([]);
  });

  it('returns the stored symbols', async () => {
    const deps = makeDeps(['BTC', 'ETH']);
    const result = await getCuratedSymbols('uid', deps);
    expect(result).toEqual(['BTC', 'ETH']);
  });
});

// ---------------------------------------------------------------------------
// addSymbol — happy paths
// ---------------------------------------------------------------------------

describe('addSymbol — happy paths', () => {
  it('adds a valid symbol to an empty list', async () => {
    const deps = makeDeps([]);
    const result = await addSymbol('uid', 'BTC', FREE_SLOTS, deps);
    expect(result).toEqual(['BTC']);
  });

  it('adds a second symbol', async () => {
    const deps = makeDeps(['BTC']);
    const result = await addSymbol('uid', 'ETH', FREE_SLOTS, deps);
    expect(result).toEqual(['BTC', 'ETH']);
  });

  it('deduplicates silently — adding existing symbol returns current list unchanged', async () => {
    const deps = makeDeps(['BTC', 'ETH']);
    const result = await addSymbol('uid', 'BTC', FREE_SLOTS, deps);
    expect(result).toEqual(['BTC', 'ETH']);
  });

  it('pro user can add beyond free limit', async () => {
    const deps = makeDeps(['BTC', 'ETH', 'SOL', 'BNB', 'AVAX']);
    const result = await addSymbol('uid', 'ARB', PRO_SLOTS, deps);
    expect(result).toEqual(['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB']);
  });

  it('persists the updated list', async () => {
    const deps = makeDeps(['BTC']);
    await addSymbol('uid', 'SOL', FREE_SLOTS, deps);
    const stored = deps.store.get('uid');
    expect(stored).toEqual(['BTC', 'SOL']);
  });
});

// ---------------------------------------------------------------------------
// addSymbol — error cases
// ---------------------------------------------------------------------------

describe('addSymbol — slot limit', () => {
  it('returns slots_exceeded when free user is at max (5)', async () => {
    const deps = makeDeps(['BTC', 'ETH', 'SOL', 'BNB', 'AVAX']);
    const result = await addSymbol('uid', 'ARB', FREE_SLOTS, deps);
    expect(result).toEqual({ code: 'slots_exceeded', message: expect.stringContaining('5') });
  });

  it('does not persist the symbol when slots exceeded', async () => {
    const deps = makeDeps(['BTC', 'ETH', 'SOL', 'BNB', 'AVAX']);
    await addSymbol('uid', 'ARB', FREE_SLOTS, deps);
    expect(deps.store.get('uid')).toHaveLength(5);
  });

  it('slots_exceeded does not trigger for an already-present symbol', async () => {
    // At 5/5 but adding a duplicate → dedupe path, not error
    const deps = makeDeps(['BTC', 'ETH', 'SOL', 'BNB', 'AVAX']);
    const result = await addSymbol('uid', 'BTC', FREE_SLOTS, deps);
    expect(result).toEqual(['BTC', 'ETH', 'SOL', 'BNB', 'AVAX']);
  });
});

describe('addSymbol — invalid symbol', () => {
  it('returns invalid_symbol for an unknown ticker', async () => {
    const deps = makeDeps([]);
    const result = await addSymbol('uid', 'SHIB', FREE_SLOTS, deps);
    expect(result).toEqual({ code: 'invalid_symbol', message: expect.stringContaining('SHIB') });
  });

  it('returns invalid_symbol for empty string', async () => {
    const deps = makeDeps([]);
    const result = await addSymbol('uid', '', FREE_SLOTS, deps);
    expect(result).toEqual({ code: 'invalid_symbol', message: expect.any(String) });
  });

  it('does not persist for invalid symbol', async () => {
    const deps = makeDeps([]);
    await addSymbol('uid', 'FAKE', FREE_SLOTS, deps);
    expect(deps.store.get('uid')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// removeSymbol
// ---------------------------------------------------------------------------

describe('removeSymbol', () => {
  it('removes an existing symbol', async () => {
    const deps = makeDeps(['BTC', 'ETH', 'SOL']);
    const result = await removeSymbol('uid', 'ETH', deps);
    expect(result).toEqual(['BTC', 'SOL']);
  });

  it('removing a non-existent symbol is a no-op', async () => {
    const deps = makeDeps(['BTC', 'ETH']);
    const result = await removeSymbol('uid', 'ARB', deps);
    expect(result).toEqual(['BTC', 'ETH']);
  });

  it('does not call setSymbols when symbol was not present', async () => {
    let setCalled = false;
    const deps: WatchlistDeps = {
      async getSymbols() { return ['BTC']; },
      async setSymbols() { setCalled = true; },
    };
    await removeSymbol('uid', 'SOL', deps);
    expect(setCalled).toBe(false);
  });

  it('persists the updated list after removal', async () => {
    const deps = makeDeps(['BTC', 'ETH', 'SOL']);
    await removeSymbol('uid', 'ETH', deps);
    expect(deps.store.get('uid')).toEqual(['BTC', 'SOL']);
  });

  it('can remove from a single-item list leaving empty', async () => {
    const deps = makeDeps(['BTC']);
    const result = await removeSymbol('uid', 'BTC', deps);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ALLOWED_SYMBOLS
// ---------------------------------------------------------------------------

describe('ALLOWED_SYMBOLS', () => {
  it('contains exactly 10 symbols', () => {
    expect(ALLOWED_SYMBOLS).toHaveLength(10);
  });

  it('includes the expected assets', () => {
    const expected = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE', 'LINK', 'APT', 'SUI'];
    for (const sym of expected) {
      expect(ALLOWED_SYMBOLS).toContain(sym);
    }
  });
});
