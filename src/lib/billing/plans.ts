/**
 * Kumami Pro plans — the single source of truth for prices, durations and
 * referral rewards (Andrew's spec v1.13, Pro §21 + §22; decided 11 Oct 2026).
 * All money is integer US cents. Pure; safe on client and server.
 */

export type PlanId = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number;
  /** Days of Pro a crypto (prepaid) payment adds. Card plans renew via Stripe. */
  days: number;
  /** Credited to BOTH the referrer and the new user, once, on the new user's first payment. */
  referralRewardCents: number;
  /** Env var holding the Stripe Price id for this plan. */
  stripePriceEnv: 'STRIPE_PRICE_MONTHLY' | 'STRIPE_PRICE_YEARLY';
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: { id: 'monthly', name: 'Monthly', priceCents: 1999, days: 30, referralRewardCents: 100, stripePriceEnv: 'STRIPE_PRICE_MONTHLY' },
  yearly: { id: 'yearly', name: 'Yearly', priceCents: 19999, days: 365, referralRewardCents: 1000, stripePriceEnv: 'STRIPE_PRICE_YEARLY' },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

/** Pro continues this long past a card period end while Stripe retries a failed renewal. */
export const STRIPE_GRACE_MS = 3 * 86_400_000;

/** Crypto Pro shows an "extend" reminder this long before it ends. */
export const CRYPTO_REMINDER_MS = 7 * 86_400_000;

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === 'string' && v in PLANS;
}

/** 1999 → "$19.99"; -100 → "-$1.00". */
export function formatUsd(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}$${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
}
