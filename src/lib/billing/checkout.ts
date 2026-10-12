/**
 * Starting a checkout (spec v1.13 Pro §21). Creates a checkout_orders doc, then
 * the provider session (Stripe Checkout / NOWPayments invoice). Pro is never
 * granted here — only by the verified webhook.
 */
import { isProActive, toMillis } from '@/lib/pro';
import { PLANS, type PlanId } from './plans';
import { checkCode, normalizeCode } from './referralCode';
import type { Doc, Store } from './store';

export type Provider = 'stripe' | 'crypto';

export type CheckoutError =
  | { code: 'already_subscribed'; status: 409 }
  | { code: 'invalid_referral_code'; status: 400; reason: string }
  | { code: 'user_not_found'; status: 404 }
  | { code: 'provider_error'; status: 502 };

/**
 * No second subscription while Pro (Andrew, 11 Oct 2026). Exception: crypto may
 * extend crypto (prepaid days stack). A Stripe subscription that is still alive
 * (active / past_due / cancelling) also blocks a new card checkout.
 */
export function blockReason(user: Doc, provider: Provider, nowMs: number): 'already_subscribed' | null {
  const active = isProActive({ isPremium: user.isPremium, proUntil: toMillis(user.proUntil as Date) }, nowMs);
  const stripeAlive = !!user.stripeSubscriptionId && ['active', 'past_due', 'canceling'].includes(String(user.subscriptionStatus));
  if (provider === 'stripe') return active || stripeAlive ? 'already_subscribed' : null;
  if (stripeAlive) return 'already_subscribed';
  if (active && user.proSource !== 'crypto') return 'already_subscribed';
  return null;
}

export interface OrderInput {
  uid: string;
  provider: Provider;
  plan: PlanId;
  referralCode: unknown;
}

/** Validate and create the pending order. Returns the order id or an error. */
export async function createOrder(
  store: Store,
  input: OrderInput,
  p: { now: Date; newId: () => string },
): Promise<{ ok: true; orderId: string; user: Doc; referralCode: string | null } | { ok: false; error: CheckoutError }> {
  const user = await store.get(`users/${input.uid}`);
  if (!user) return { ok: false, error: { code: 'user_not_found', status: 404 } };
  if (blockReason(user, input.provider, p.now.getTime())) return { ok: false, error: { code: 'already_subscribed', status: 409 } };

  let referralCode: string | null = null;
  const raw = typeof input.referralCode === 'string' ? input.referralCode.trim() : '';
  if (raw) {
    const check = await checkCode(store, raw, input.uid);
    if (!check.valid) return { ok: false, error: { code: 'invalid_referral_code', status: 400, reason: check.reason } };
    referralCode = normalizeCode(raw);
  }

  const orderId = p.newId();
  await store.runTransaction(async (tx) => {
    tx.set(`checkout_orders/${orderId}`, {
      userId: input.uid, provider: input.provider, plan: input.plan, amountCents: PLANS[input.plan].priceCents,
      currency: 'usd', referralCode, status: 'pending', providerRef: null, createdAt: p.now,
    });
  });
  return { ok: true, orderId, user, referralCode };
}
