import 'server-only';
import Stripe from 'stripe';
import type { StripeDeps, StripeSubFull } from './stripeWebhook';
import { PLANS, PLAN_IDS, type PlanId } from './plans';
import type { Store } from './store';

let client: Stripe | null = null;

/** Throws a clear error when the key is missing (routes turn it into 503 billing_not_configured). */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new BillingNotConfigured('STRIPE_SECRET_KEY');
  // apiVersion: the SDK's pinned default (stripe@22.6.2 → 2026-08-26.dahlia).
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: 'kumami-web' } });
  return client;
}

export class BillingNotConfigured extends Error {
  constructor(readonly missing: string) {
    super(`Billing not configured: ${missing}`);
  }
}

export function stripePriceId(plan: PlanId): string {
  const id = process.env[PLANS[plan].stripePriceEnv];
  if (!id) throw new BillingNotConfigured(PLANS[plan].stripePriceEnv);
  return id;
}

export function planForPrice(priceId: string | null): PlanId | null {
  if (!priceId) return null;
  return PLAN_IDS.find((p) => process.env[PLANS[p].stripePriceEnv] === priceId) ?? null;
}

export function toSubFull(sub: Stripe.Subscription): StripeSubFull {
  const item = sub.items.data[0];
  return {
    snapshot: {
      id: sub.id,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      // API 2025-03-31.basil+: the billing period lives on the subscription item.
      periodStartMs: (item?.current_period_start ?? sub.start_date) * 1000,
      periodEndMs: (item?.current_period_end ?? sub.start_date) * 1000,
      endedAtMs: sub.ended_at ? sub.ended_at * 1000 : null,
    },
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    priceId: item?.price?.id ?? null,
    metadata: { ...(sub.metadata ?? {}) },
  };
}

export function stripeDeps(store: Store): StripeDeps {
  return {
    store,
    now: () => new Date(),
    retrieveSubscription: async (id) => toSubFull(await stripe().subscriptions.retrieve(id)),
    invoicePaymentIntent: async (invoiceId) => {
      const list = await stripe().invoicePayments.list({ invoice: invoiceId, status: 'paid', limit: 1 });
      const pi = list.data[0]?.payment?.payment_intent;
      return typeof pi === 'string' ? pi : pi?.id ?? null;
    },
    cancelSubscriptionNow: async (id) => {
      try {
        await stripe().subscriptions.cancel(id);
      } catch (e) {
        // Already cancelled → nothing to do; anything else must surface (Stripe will retry the webhook).
        if (!(e instanceof Stripe.errors.StripeInvalidRequestError)) throw e;
      }
    },
    planForPrice,
  };
}
