import { describe, it, expect } from 'vitest';
import { subscriptionSummary } from '../summary';
import { signCallbackToken, verifyCallbackToken } from '@/lib/kuma/callbackToken';
import { optionalUser, rateLimited, requireUser } from '@/lib/api/v1';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 11, 12);

describe('subscriptionSummary', () => {
  it('never subscribed', () => {
    expect(subscriptionSummary(null, NOW)).toMatchObject({ isPro: false, source: null, plan: null, canCancel: false, showRenewReminder: false });
  });
  it('card, active → can cancel + update card; canceling → can resume', () => {
    const u = { isPremium: true, proUntil: new Date(NOW + 20 * DAY), proSource: 'stripe', plan: 'monthly', subscriptionStatus: 'active', stripeSubscriptionId: 's' };
    expect(subscriptionSummary(u, NOW)).toMatchObject({ isPro: true, canCancel: true, canResume: false, canUpdateCard: true });
    expect(subscriptionSummary({ ...u, subscriptionStatus: 'canceling', cancelAtPeriodEnd: true }, NOW)).toMatchObject({ canCancel: false, canResume: true });
  });
  it('crypto ending within 7 days → reminder; 10 days → none', () => {
    const u = { isPremium: true, proSource: 'crypto', plan: 'yearly', subscriptionStatus: 'active' };
    expect(subscriptionSummary({ ...u, proUntil: new Date(NOW + 3 * DAY) }, NOW).showRenewReminder).toBe(true);
    expect(subscriptionSummary({ ...u, proUntil: new Date(NOW + 10 * DAY) }, NOW).showRenewReminder).toBe(false);
    expect(subscriptionSummary({ ...u, proUntil: new Date(NOW + 3 * DAY) }, NOW).canCancel).toBe(false);
  });
  it('admin grant with no end date', () => {
    expect(subscriptionSummary({ isPremium: true, proUntil: null, proSource: 'admin' }, NOW)).toMatchObject({ isPro: true, proUntil: null, source: 'admin', canUpdateCard: false });
  });
});

describe('Kuma callback token', () => {
  const S = 'secret';
  it('valid only for the same user + room, before expiry', () => {
    const t = signCallbackToken('u1', 'room1', S, NOW);
    expect(verifyCallbackToken(t, 'u1', 'room1', S, NOW + 60_000)).toBe(true);
    expect(verifyCallbackToken(t, 'u2', 'room1', S, NOW)).toBe(false);
    expect(verifyCallbackToken(t, 'u1', 'room2', S, NOW)).toBe(false);
    expect(verifyCallbackToken(t, 'u1', 'room1', 'other', NOW)).toBe(false);
    expect(verifyCallbackToken(t, 'u1', 'room1', S, NOW + 16 * 60_000)).toBe(false);
    expect(verifyCallbackToken(null, 'u1', 'room1', S, NOW)).toBe(false);
    expect(verifyCallbackToken('123.abc', 'u1', 'room1', S, NOW)).toBe(false);
  });
});

describe('api/v1 helpers', () => {
  const verify = async (t: string) => {
    if (t === 'good') return { uid: 'u1', email: 'a@b' };
    throw new Error('bad');
  };
  const req = (auth?: string) => new Request('http://x/api', { headers: auth ? { Authorization: auth } : {} });
  it('requireUser: 401 without / with a bad token', async () => {
    const r1 = await requireUser(req(), verify);
    expect('status' in r1 && r1.status).toBe(401);
    const r2 = await requireUser(req('Bearer nope'), verify);
    expect('status' in r2 && r2.status).toBe(401);
    expect(await requireUser(req('Bearer good'), verify)).toEqual({ uid: 'u1', email: 'a@b' });
    expect(await optionalUser(req(), verify)).toBeNull();
  });
  it('error body shape', async () => {
    const r = await requireUser(req(), verify);
    expect(await (r as Response).json()).toMatchObject({ error: { code: 'unauthorized' } });
  });
  it('rate limiter', () => {
    const k = `t${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimited(k, 3, 1000, NOW)).toBe(false);
    expect(rateLimited(k, 3, 1000, NOW)).toBe(true);
    expect(rateLimited(k, 3, 1000, NOW + 1001)).toBe(false);
  });
});
