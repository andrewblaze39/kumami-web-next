/**
 * POST /api/v1/subscription/payment-method → { url }: Stripe's hosted page for
 * changing the card (Billing Portal, "payment_method_update" flow only), returning
 * to Profile → Subscription. No card details ever touch Kumami's servers.
 */
import { NextResponse } from 'next/server';
import { baseUrl, fail, handler, ok, requireUser } from '@/lib/api/v1';
import { liveStripeSubscription } from '@/lib/billing/manage';
import { stripe } from '@/lib/billing/stripeClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler('subscription/payment-method', async (req: Request) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const live = await liveStripeSubscription(caller.uid);
  if (live instanceof Response) return live as NextResponse;
  const customer = typeof live.user.stripeCustomerId === 'string' ? live.user.stripeCustomerId : null;
  if (!customer) return fail('no_card_subscription', 409, 'You have no active card subscription.');
  const returnUrl = `${baseUrl(req)}/world/profile?tab=subscription`;
  const session = await stripe().billingPortal.sessions.create({
    customer,
    return_url: returnUrl,
    flow_data: {
      type: 'payment_method_update',
      after_completion: { type: 'redirect', redirect: { return_url: returnUrl } },
    },
  });
  return ok({ url: session.url });
});
