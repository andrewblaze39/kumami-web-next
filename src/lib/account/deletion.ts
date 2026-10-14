/**
 * Self-serve account deletion (GDPR / CCPA, app-store requirement).
 * DELETE /api/v1/me runs this. Pure apart from the injected deps — unit-tested.
 *
 * Deleted: users/{uid} and everything under it, user_prefs/{uid},
 * watchlists/{uid}, the user's alerts and referral code, and the Auth user.
 * Kept (tax / accounting, pseudonymous — uid only): payments, checkout_orders,
 * subscriptions, webhook_events, referral_rewards, referral_ledger, admin_audit.
 */
import type { Doc } from '@/lib/billing/store';

/** The caller must have signed in again within this window (Firebase `auth_time`). */
export const REAUTH_MAX_AGE_SEC = 5 * 60;

export type DeletionBlock = 'staff_account' | 'reauth_required';

/** Card subscription states that can still charge or grant Pro. */
const LIVE_STRIPE = new Set(['active', 'past_due', 'canceling']);

/** Staff (any role other than a plain user) must have the role removed first. */
export function isStaff(user: Doc | null): boolean {
  if (!user) return false;
  const role = typeof user.role === 'string' ? user.role : 'user';
  return role !== 'user' || user.isAdmin === true;
}

/** Why this caller may not delete right now, or null when they may. */
export function deletionBlocker(user: Doc | null, authTimeSec: number | undefined, nowMs: number): DeletionBlock | null {
  if (isStaff(user)) return 'staff_account';
  if (!authTimeSec || nowMs / 1000 - authTimeSec > REAUTH_MAX_AGE_SEC) return 'reauth_required';
  return null;
}

/** The Stripe subscription to cancel now, if the user still has a live one. */
export function liveStripeSubscriptionId(user: Doc | null): string | null {
  const id = typeof user?.stripeSubscriptionId === 'string' ? user.stripeSubscriptionId : null;
  return id && LIVE_STRIPE.has(String(user?.subscriptionStatus)) ? id : null;
}

export interface DeletionDeps {
  /** Cancel immediately, no refund. Must tolerate an already-cancelled subscription. */
  cancelStripeSubscription(id: string): Promise<void>;
  /** Sign the user out everywhere (revoke refresh tokens). */
  revokeSessions(uid: string): Promise<void>;
  deleteUserData(uid: string): Promise<void>;
  /** Must tolerate an Auth user that is already gone. */
  deleteAuthUser(uid: string): Promise<void>;
}

/**
 * Order matters: stop billing first (if that fails nothing is deleted and the
 * user can retry), then data, then the Auth user (so a failed data delete can
 * be retried by the same signed-in user).
 */
export async function deleteAccount(uid: string, user: Doc | null, deps: DeletionDeps): Promise<{ stripeCanceled: boolean }> {
  const subId = liveStripeSubscriptionId(user);
  if (subId) await deps.cancelStripeSubscription(subId);
  await deps.revokeSessions(uid);
  await deps.deleteUserData(uid);
  await deps.deleteAuthUser(uid);
  return { stripeCanceled: subId !== null };
}
