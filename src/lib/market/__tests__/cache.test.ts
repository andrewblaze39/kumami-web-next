/**
 * Tests for src/lib/market/cache.ts
 * Uses injectable in-memory deps — never touches real Firestore.
 */
import { describe, it, expect, vi } from 'vitest';
import { getCached, type CacheDeps } from '../cache';

// ---------------------------------------------------------------------------
// In-memory store factory
// ---------------------------------------------------------------------------
function makeStore(): {
  data: Map<string, { value: unknown; updatedAt: number }>;
  deps: (nowMs?: number) => CacheDeps;
} {
  const data = new Map<string, { value: unknown; updatedAt: number }>();
  const deps = (nowMs?: number): CacheDeps => ({
    get: async (key: string) => data.get(key) ?? null,
    set: async (key: string, value: unknown, updatedAt: number) => {
      data.set(key, { value, updatedAt });
    },
    now: nowMs !== undefined ? () => nowMs : () => Date.now(),
  });
  return { data, deps };
}

// ---------------------------------------------------------------------------
// 1. Fresh cache hit — fetcher must NOT be called
// ---------------------------------------------------------------------------
describe('getCached — fresh hit', () => {
  it('returns cached value without calling fetcher', async () => {
    const { data, deps } = makeStore();
    const nowMs = 1_000_000;
    // Seed a fresh entry (1 s old, ttl = 60 s)
    data.set('k1', { value: 'cached-value', updatedAt: nowMs - 1_000 });

    const fetcher = vi.fn(async () => 'fresh-value');
    const result = await getCached('k1', 60, fetcher, deps(nowMs));

    expect(result).toBe('cached-value');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. Stale cache — fetcher called, result stored and returned
// ---------------------------------------------------------------------------
describe('getCached — stale refetch', () => {
  it('calls fetcher when cache is stale and returns new value', async () => {
    const { data, deps } = makeStore();
    const nowMs = 1_000_000;
    // Seed a stale entry (120 s old, ttl = 60 s)
    data.set('k2', { value: 'old-value', updatedAt: nowMs - 120_000 });

    const fetcher = vi.fn(async () => 'new-value');
    const result = await getCached('k2', 60, fetcher, deps(nowMs));

    expect(result).toBe('new-value');
    expect(fetcher).toHaveBeenCalledOnce();
    // Stored value updated
    expect(data.get('k2')?.value).toBe('new-value');
  });

  it('calls fetcher when no cached entry exists', async () => {
    const { deps } = makeStore();
    const nowMs = 1_000_000;
    const fetcher = vi.fn(async () => 42);
    const result = await getCached('k-missing', 60, fetcher, deps(nowMs));
    expect(result).toBe(42);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 3. Stampede guard — two concurrent calls → only one fetcher invocation
// ---------------------------------------------------------------------------
describe('getCached — stampede guard', () => {
  it('issues only one fetcher call when two concurrent requests hit a stale key', async () => {
    const { data, deps } = makeStore();
    const nowMs = 1_000_000;
    // Seed stale value
    data.set('stampede', { value: 'stale', updatedAt: nowMs - 120_000 });

    let resolveFetcher!: (v: string) => void;
    const fetcherPromise = new Promise<string>((res) => {
      resolveFetcher = res;
    });
    const fetcher = vi.fn(() => fetcherPromise);

    const d = deps(nowMs);
    const p1 = getCached('stampede', 60, fetcher, d);
    const p2 = getCached('stampede', 60, fetcher, d);

    // Resolve fetcher
    resolveFetcher('resolved');

    const [r1, r2] = await Promise.all([p1, p2]);

    // Fetcher called exactly once
    expect(fetcher).toHaveBeenCalledOnce();
    // Both callers get a value: p1 gets resolved, p2 gets stale (served stale while in-flight)
    expect(r1).toBe('resolved');
    // p2 served the stale value because fetch was already in-flight
    expect(r2).toBe('stale');
  });

  it('issues only one fetcher call when two concurrent requests hit a MISSING key', async () => {
    const { deps } = makeStore();
    const nowMs = 1_000_000;

    let resolveFetcher!: (v: string) => void;
    const fetcherPromise = new Promise<string>((res) => {
      resolveFetcher = res;
    });
    const fetcher = vi.fn(() => fetcherPromise);

    const d = deps(nowMs);
    const p1 = getCached('missing-stampede', 60, fetcher, d);
    const p2 = getCached('missing-stampede', 60, fetcher, d);

    resolveFetcher('resolved-missing');

    const [r1, r2] = await Promise.all([p1, p2]);

    // Both should resolve — one gets the fetched value, one awaits the in-flight
    expect(fetcher).toHaveBeenCalledOnce();
    expect(r1).toBe('resolved-missing');
    expect(r2).toBe('resolved-missing');
  });
});

// ---------------------------------------------------------------------------
// 4. Fetcher error with stale value — serve stale
// ---------------------------------------------------------------------------
describe('getCached — fetcher error with stale value', () => {
  it('serves stale value when fetcher throws and stale exists', async () => {
    const { data, deps } = makeStore();
    const nowMs = 1_000_000;
    data.set('err-stale', { value: 'stale-data', updatedAt: nowMs - 200_000 });

    const fetcher = vi.fn(async () => {
      throw new Error('network down');
    });

    const result = await getCached('err-stale', 60, fetcher, deps(nowMs));
    expect(result).toBe('stale-data');
  });
});

// ---------------------------------------------------------------------------
// 5. Fetcher error with NO stale value — rethrow
// ---------------------------------------------------------------------------
describe('getCached — fetcher error with no stale', () => {
  it('rethrows when fetcher throws and no cached entry exists', async () => {
    const { deps } = makeStore();
    const fetcher = vi.fn(async () => {
      throw new Error('fatal');
    });

    await expect(getCached('no-cache', 60, fetcher, deps(Date.now()))).rejects.toThrow('fatal');
  });
});
