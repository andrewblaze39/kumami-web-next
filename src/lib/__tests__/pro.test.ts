import { describe, it, expect } from 'vitest';
import { isProActive, toMillis } from '../pro';

describe('isProActive', () => {
  const now = Date.UTC(2026, 9, 10);
  it('requires isPremium === true', () => {
    expect(isProActive({ isPremium: false }, now)).toBe(false);
    expect(isProActive({}, now)).toBe(false);
    expect(isProActive(null, now)).toBe(false);
    expect(isProActive({ isPremium: 'true' }, now)).toBe(false);
  });
  it('no end date = Pro until removed', () => {
    expect(isProActive({ isPremium: true }, now)).toBe(true);
    expect(isProActive({ isPremium: true, proUntil: null }, now)).toBe(true);
  });
  it('a past end date switches Pro off; a future one keeps it on', () => {
    expect(isProActive({ isPremium: true, proUntil: now - 1 }, now)).toBe(false);
    expect(isProActive({ isPremium: true, proUntil: now + 86_400_000 }, now)).toBe(true);
  });
  it('reads Firestore Timestamps (client + admin shapes)', () => {
    expect(isProActive({ isPremium: true, proUntil: { toMillis: () => now - 5 } }, now)).toBe(false);
    expect(isProActive({ isPremium: true, proUntil: { seconds: (now + 60_000) / 1000 } }, now)).toBe(true);
  });
});

describe('toMillis', () => {
  it('handles numbers, ISO strings, Timestamps and junk', () => {
    expect(toMillis(5)).toBe(5);
    expect(toMillis('2026-10-10T00:00:00Z')).toBe(Date.UTC(2026, 9, 10));
    expect(toMillis('nope')).toBeNull();
    expect(toMillis(undefined)).toBeNull();
  });
});
