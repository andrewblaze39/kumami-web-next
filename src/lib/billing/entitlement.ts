/**
 * Pro access derived from payment-provider state (spec v1.13 Pro §21).
 * Everything that checks Pro (lib/pro.ts isProActive, gating.resolveTier,
 * Firestore rules) reads users/{uid}.isPremium + proUntil — these pure
 * functions decide what to write there. Pure; unit-tested.
 */
import { STRIPE_GRACE_MS } from './plans';

export type SubscriptionStatus = 'active' | 'canceling' | 'past_due' | 'canceled' | 'expired' | 'incomplete';

/** The parts of a Stripe Subscription the entitlement depends on (ms timestamps). */
export interface StripeSubSnapshot {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  periodStartMs: number;
  periodEndMs: number;
  endedAtMs: number | null;
}

export interface UserEntitlement {
  isPremium: boolean;
  proUntil: Date;
  subscriptionStatus: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
}

/**
 * - active / trialing → Pro until period end + 3-day grace (covers a late renewal webhook)
 * - past_due → Stripe has already rolled the period forward but the renewal failed:
 *   keep Pro only until the PREVIOUS period end (= current period start) + grace
 * - canceled / unpaid / incomplete_expired / paused → Pro off
 * - incomplete (first payment still pending) → null = change nothing
 */
export function stripeEntitlement(sub: StripeSubSnapshot, nowMs: number): UserEntitlement | null {
  switch (sub.status) {
    case 'active':
    case 'trialing':
      return {
        isPremium: true,
        proUntil: new Date(sub.periodEndMs + STRIPE_GRACE_MS),
        subscriptionStatus: sub.cancelAtPeriodEnd ? 'canceling' : 'active',
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      };
    case 'past_due':
      return {
        isPremium: true,
        proUntil: new Date(sub.periodStartMs + STRIPE_GRACE_MS),
        subscriptionStatus: 'past_due',
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      };
    case 'canceled':
    case 'unpaid':
    case 'paused':
    case 'incomplete_expired':
      return {
        isPremium: false,
        proUntil: new Date(sub.endedAtMs ?? nowMs),
        subscriptionStatus: sub.status === 'incomplete_expired' ? 'expired' : 'canceled',
        cancelAtPeriodEnd: false,
      };
    default:
      return null;
  }
}

/**
 * Crypto is prepaid: a payment adds `days` on top of any crypto time still left
 * (max(now, current end) + days). Time from another source (card/admin) is not stacked on.
 */
export function cryptoProUntil(
  user: { isPremium?: unknown; proUntil?: number | null; proSource?: unknown },
  days: number,
  nowMs: number,
): Date {
  const until = typeof user.proUntil === 'number' ? user.proUntil : null;
  const stillCrypto = user.isPremium === true && user.proSource === 'crypto' && until !== null && until > nowMs;
  const base = stillCrypto ? until : nowMs;
  return new Date(base + days * 86_400_000);
}
