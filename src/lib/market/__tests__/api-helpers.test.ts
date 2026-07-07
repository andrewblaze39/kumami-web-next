/**
 * Tests for src/lib/market/api-helpers.ts
 *
 * All Firebase calls are replaced by injected stubs — no real Firebase.
 */

import { describe, it, expect, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { authenticate } from '../api-helpers';
import type { GatingDeps } from '../gating';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(authHeader?: string): Request {
  return new Request('http://localhost/api/market/console', {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

/** Injectable gating deps — always returns a pro user unless overridden. */
function makeGatingDeps(isPremium = true): GatingDeps {
  return {
    async getUser() {
      return { isPremium };
    },
  };
}

// ---------------------------------------------------------------------------
// authenticate() — auth header validation
// ---------------------------------------------------------------------------

describe('authenticate()', () => {
  describe('missing / malformed Authorization header', () => {
    it('returns 401 when header is absent', async () => {
      const result = await authenticate(makeRequest());
      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'unauthorized' });
    });

    it('returns 401 when header does not start with "Bearer "', async () => {
      const result = await authenticate(makeRequest('Token abc123'));
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
    });

    it('returns 401 when Bearer token is empty string', async () => {
      const result = await authenticate(makeRequest('Bearer '));
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
    });
  });

  describe('verifier throws (invalid / expired token)', () => {
    it('returns 401 when verifier throws', async () => {
      const verifier = vi.fn().mockRejectedValue(new Error('Token expired'));
      const result = await authenticate(makeRequest('Bearer bad-token'), {
        verifier,
        gatingDeps: makeGatingDeps(),
      });
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
      expect(verifier).toHaveBeenCalledWith('bad-token');
    });
  });

  describe('success path', () => {
    it('returns { uid, tier: "pro" } when user isPremium=true', async () => {
      const verifier = vi.fn().mockResolvedValue({ uid: 'user-pro-123' });
      const result = await authenticate(makeRequest('Bearer valid-token'), {
        verifier,
        gatingDeps: makeGatingDeps(true),
      });
      expect(result).not.toBeInstanceOf(NextResponse);
      const auth = result as { uid: string; tier: string };
      expect(auth.uid).toBe('user-pro-123');
      expect(auth.tier).toBe('pro');
    });

    it('returns { uid, tier: "free" } when user isPremium=false', async () => {
      const verifier = vi.fn().mockResolvedValue({ uid: 'user-free-456' });
      const result = await authenticate(makeRequest('Bearer valid-token'), {
        verifier,
        gatingDeps: makeGatingDeps(false),
      });
      expect(result).not.toBeInstanceOf(NextResponse);
      const auth = result as { uid: string; tier: string };
      expect(auth.uid).toBe('user-free-456');
      expect(auth.tier).toBe('free');
    });

    it('passes the extracted token (without "Bearer " prefix) to verifier', async () => {
      const verifier = vi.fn().mockResolvedValue({ uid: 'uid-abc' });
      await authenticate(makeRequest('Bearer my-id-token'), {
        verifier,
        gatingDeps: makeGatingDeps(),
      });
      expect(verifier).toHaveBeenCalledWith('my-id-token');
    });
  });
});

// ---------------------------------------------------------------------------
// Gating composition — flow radar delay
// ---------------------------------------------------------------------------

import { applyDelay } from '../gating';
import type { FlowEvent } from '../contracts';

function makeEvent(id: string, ageMs: number): FlowEvent {
  return {
    id,
    type: 'whale_transfer',
    asset: 'BTC',
    amountUsd: 1_000_000,
    direction: 'Inflow',
    severity: 'HIGH',
    description: 'test event',
    ts: new Date(Date.now() - ageMs).toISOString(),
  };
}

describe('gating composition — flow radar applyDelay', () => {
  const DELAY_MS = 30 * 60 * 1000; // 30 minutes in ms

  it('free tier: filters out events newer than delay window', () => {
    const now = Date.now();
    const events: FlowEvent[] = [
      makeEvent('new', 5 * 60 * 1000),   // 5 min ago — should be withheld
      makeEvent('old', 35 * 60 * 1000),  // 35 min ago — should pass
    ];
    const result = applyDelay(events, 'free', now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('old');
  });

  it('free tier: all events within delay window → empty array', () => {
    const now = Date.now();
    const events: FlowEvent[] = [
      makeEvent('a', 1 * 60 * 1000),
      makeEvent('b', 10 * 60 * 1000),
      makeEvent('c', 29 * 60 * 1000),
    ];
    const result = applyDelay(events, 'free', now);
    expect(result).toHaveLength(0);
  });

  it('pro tier: all events pass through regardless of age', () => {
    const now = Date.now();
    const events: FlowEvent[] = [
      makeEvent('new', 1 * 60 * 1000),
      makeEvent('mid', 20 * 60 * 1000),
      makeEvent('old', DELAY_MS + 1),
    ];
    const result = applyDelay(events, 'pro', now);
    expect(result).toHaveLength(3);
  });

  it('free tier: response contains no event newer than delay window', () => {
    const now = Date.now();
    const events: FlowEvent[] = Array.from({ length: 12 }, (_, i) =>
      makeEvent(`ev-${i}`, i * 5 * 60 * 1000), // 0, 5, 10, 15, 20, 25, 30, 35... min ago
    );
    const result = applyDelay(events, 'free', now);
    for (const ev of result) {
      const ageMs = now - new Date(ev.ts).getTime();
      expect(ageMs).toBeGreaterThanOrEqual(DELAY_MS);
    }
  });
});

// ---------------------------------------------------------------------------
// Gating composition — heatmap capAssets
// ---------------------------------------------------------------------------

import { capAssets } from '../gating';

describe('gating composition — heatmap capAssets', () => {
  const TEN_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE', 'LINK', 'APT', 'SUI'];

  it('free tier: caps to 5 assets', () => {
    const capped = capAssets(TEN_ASSETS, 'free');
    expect(capped).toHaveLength(5);
    expect(capped).toEqual(TEN_ASSETS.slice(0, 5));
  });

  it('free tier: capped flag is true when original > capped', () => {
    const capped = capAssets(TEN_ASSETS, 'free');
    const wasCapped = TEN_ASSETS.length > capped.length;
    expect(wasCapped).toBe(true);
  });

  it('pro tier: full list returned, not capped', () => {
    const result = capAssets(TEN_ASSETS, 'pro');
    expect(result).toHaveLength(10);
    expect(result).toEqual(TEN_ASSETS);
    // For pro tier, capAssets returns the full list — no capping occurs
    expect(result.length).toBe(TEN_ASSETS.length);
  });
});

// ---------------------------------------------------------------------------
// Gating composition — watchlist slots
// ---------------------------------------------------------------------------

import { watchlistSlots } from '../gating';

describe('gating composition — watchlistSlots', () => {
  it('free tier: slots = 5 by default', () => {
    expect(watchlistSlots('free')).toBe(5);
  });

  it('pro tier: slots = Infinity', () => {
    expect(watchlistSlots('pro')).toBe(Infinity);
  });

  it('free tier: slicing assets array to slots produces max 5 items', () => {
    const assets = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE'];
    const slots = watchlistSlots('free');
    const sliced = Number.isFinite(slots) ? assets.slice(0, slots) : assets;
    expect(sliced).toHaveLength(5);
  });

  it('pro tier: Infinity means no slice applied', () => {
    const assets = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE'];
    const slots = watchlistSlots('pro');
    const sliced = Number.isFinite(slots) ? assets.slice(0, slots) : assets;
    expect(sliced).toHaveLength(assets.length);
  });
});
