/**
 * Tests for src/lib/market/gating.ts
 * Pure logic — no real Firestore; injectable deps throughout.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveTier,
  applyDelay,
  capAssets,
  watchlistSlots,
  type GatingDeps,
} from '../gating';
import type { FlowEvent } from '../contracts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(tsIso: string): FlowEvent {
  return {
    id: 'evt-1',
    type: 'whale_transfer',
    asset: 'BTC',
    amountUsd: 1_000_000,
    direction: 'Inflow',
    severity: 'HIGH',
    description: 'test event',
    ts: tsIso,
  };
}

function depsWithDoc(doc: Record<string, unknown> | null): GatingDeps {
  return {
    getUser: async () => doc,
  };
}

// ---------------------------------------------------------------------------
// resolveTier
// ---------------------------------------------------------------------------

describe('resolveTier', () => {
  it('returns "pro" when isPremium is true', async () => {
    const tier = await resolveTier('uid-1', depsWithDoc({ isPremium: true }));
    expect(tier).toBe('pro');
  });

  it('returns "pro" when role is admin', async () => {
    const tier = await resolveTier('uid-2', depsWithDoc({ role: 'admin' }));
    expect(tier).toBe('pro');
  });

  it('returns "pro" when role is superadmin', async () => {
    const tier = await resolveTier('uid-3', depsWithDoc({ role: 'superadmin' }));
    expect(tier).toBe('pro');
  });

  it('returns "free" when user doc has no premium or elevated role', async () => {
    const tier = await resolveTier('uid-4', depsWithDoc({ role: 'user', isPremium: false }));
    expect(tier).toBe('free');
  });

  it('returns "free" when user doc is missing', async () => {
    const tier = await resolveTier('uid-missing', depsWithDoc(null));
    expect(tier).toBe('free');
  });

  it('returns "free" when isPremium is false and role is user', async () => {
    const tier = await resolveTier('uid-5', depsWithDoc({ role: 'user' }));
    expect(tier).toBe('free');
  });
});

// ---------------------------------------------------------------------------
// applyDelay  — FREE_TIER_DELAY_MINUTES default = 30
// ---------------------------------------------------------------------------

describe('applyDelay', () => {
  const nowMs = new Date('2024-01-01T12:00:00.000Z').getTime();
  const delayMs = 30 * 60 * 1000; // 30 min

  it('pro: returns all events including very recent ones', () => {
    const recent = makeEvent(new Date(nowMs - 60_000).toISOString()); // 1 min old
    const result = applyDelay([recent], 'pro', nowMs);
    expect(result).toHaveLength(1);
  });

  it('free: filters out events newer than 30 minutes', () => {
    const recent = makeEvent(new Date(nowMs - 29 * 60 * 1000).toISOString()); // 29 min old
    const result = applyDelay([recent], 'free', nowMs);
    expect(result).toHaveLength(0);
  });

  it('free: keeps events exactly 30 minutes old (boundary — kept)', () => {
    const exactly30 = makeEvent(new Date(nowMs - delayMs).toISOString());
    const result = applyDelay([exactly30], 'free', nowMs);
    expect(result).toHaveLength(1);
  });

  it('free: keeps events older than 30 minutes', () => {
    const old = makeEvent(new Date(nowMs - 31 * 60 * 1000).toISOString());
    const result = applyDelay([old], 'free', nowMs);
    expect(result).toHaveLength(1);
  });

  it('free: mixed events — only old ones survive', () => {
    const recent = makeEvent(new Date(nowMs - 5 * 60 * 1000).toISOString());
    const old = makeEvent(new Date(nowMs - 60 * 60 * 1000).toISOString());
    const result = applyDelay([recent, old], 'free', nowMs);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(old);
  });

  it('free: empty input returns empty', () => {
    expect(applyDelay([], 'free', nowMs)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// capAssets — FREE_HEATMAP_ASSET_CAP default = 5
// ---------------------------------------------------------------------------

describe('capAssets', () => {
  const list = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  it('pro: returns full list', () => {
    expect(capAssets(list, 'pro')).toHaveLength(7);
  });

  it('free: slices to 5', () => {
    const result = capAssets(list, 'free');
    expect(result).toHaveLength(5);
    expect(result).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('free: list shorter than cap returns full list', () => {
    expect(capAssets(['X', 'Y'], 'free')).toHaveLength(2);
  });

  it('free: empty list returns empty', () => {
    expect(capAssets([], 'free')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// watchlistSlots
// ---------------------------------------------------------------------------

describe('watchlistSlots', () => {
  it('free: returns 5', () => {
    expect(watchlistSlots('free')).toBe(5);
  });

  it('pro: unlimited slots (Infinity)', () => {
    expect(watchlistSlots('pro')).toBe(Infinity);
  });
});
