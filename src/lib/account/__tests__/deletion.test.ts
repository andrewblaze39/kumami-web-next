import { describe, it, expect } from 'vitest';
import { deleteAccount, deletionBlocker, isStaff, liveStripeSubscriptionId, REAUTH_MAX_AGE_SEC, type DeletionDeps } from '../deletion';

const NOW = Date.UTC(2026, 9, 14, 12);
const fresh = NOW / 1000 - 30;

describe('deletionBlocker', () => {
  it('plain user with a fresh sign-in may delete', () => {
    expect(deletionBlocker({ role: 'user' }, fresh, NOW)).toBeNull();
    expect(deletionBlocker({}, fresh, NOW)).toBeNull();
    expect(deletionBlocker(null, fresh, NOW)).toBeNull(); // no profile doc yet — still deletable
  });
  it('a sign-in older than 5 minutes (or none) needs a fresh sign-in', () => {
    expect(deletionBlocker({ role: 'user' }, NOW / 1000 - REAUTH_MAX_AGE_SEC - 1, NOW)).toBe('reauth_required');
    expect(deletionBlocker({ role: 'user' }, undefined, NOW)).toBe('reauth_required');
  });
  it('every staff role is refused, even with a fresh sign-in', () => {
    for (const role of ['admin', 'superadmin', 'newsresearchadmin', 'newsdrafter', 'marketanalysisadmin']) {
      expect(deletionBlocker({ role }, fresh, NOW)).toBe('staff_account');
    }
    expect(isStaff({ role: 'user', isAdmin: true })).toBe(true);
  });
});

describe('liveStripeSubscriptionId', () => {
  it('only a live card subscription is cancelled', () => {
    expect(liveStripeSubscriptionId({ stripeSubscriptionId: 's1', subscriptionStatus: 'active' })).toBe('s1');
    expect(liveStripeSubscriptionId({ stripeSubscriptionId: 's1', subscriptionStatus: 'canceling' })).toBe('s1');
    expect(liveStripeSubscriptionId({ stripeSubscriptionId: 's1', subscriptionStatus: 'past_due' })).toBe('s1');
    expect(liveStripeSubscriptionId({ stripeSubscriptionId: 's1', subscriptionStatus: 'canceled' })).toBeNull();
    expect(liveStripeSubscriptionId({ proSource: 'crypto', subscriptionStatus: 'active' })).toBeNull();
    expect(liveStripeSubscriptionId(null)).toBeNull();
  });
});

describe('deleteAccount', () => {
  const recorder = (failOn?: string) => {
    const calls: string[] = [];
    const step = (name: string) => async (arg: string) => {
      if (name === failOn) throw new Error(`${name} failed`);
      calls.push(`${name}:${arg}`);
    };
    const deps: DeletionDeps = {
      cancelStripeSubscription: step('cancel'),
      revokeSessions: step('revoke'),
      deleteUserData: step('data'),
      deleteAuthUser: step('auth'),
    };
    return { calls, deps };
  };

  it('cancels a live card subscription first, then data, then the Auth user', async () => {
    const { calls, deps } = recorder();
    const r = await deleteAccount('u1', { stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active' }, deps);
    expect(r).toEqual({ stripeCanceled: true });
    expect(calls).toEqual(['cancel:sub_1', 'revoke:u1', 'data:u1', 'auth:u1']);
  });
  it('no subscription: nothing cancelled', async () => {
    const { calls, deps } = recorder();
    expect(await deleteAccount('u1', { role: 'user' }, deps)).toEqual({ stripeCanceled: false });
    expect(calls).toEqual(['revoke:u1', 'data:u1', 'auth:u1']);
  });
  it('if Stripe cannot be cancelled, nothing is deleted (user can retry)', async () => {
    const { calls, deps } = recorder('cancel');
    await expect(deleteAccount('u1', { stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active' }, deps)).rejects.toThrow();
    expect(calls).toEqual([]);
  });
  it('if the data delete fails, the Auth user is kept so the user can retry', async () => {
    const { calls, deps } = recorder('data');
    await expect(deleteAccount('u1', {}, deps)).rejects.toThrow();
    expect(calls).toEqual(['revoke:u1']);
  });
});
