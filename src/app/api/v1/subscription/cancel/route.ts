/**
 * POST /api/v1/subscription/cancel — card subscription stops renewing; Pro stays
 * until the end of the paid period. The Stripe webhook then updates the database.
 */
import { NextResponse } from 'next/server';
import { handler, ok, requireUser } from '@/lib/api/v1';
import { liveStripeSubscription } from '@/lib/billing/manage';
import { stripe } from '@/lib/billing/stripeClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler('subscription/cancel', async (req: Request) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const live = await liveStripeSubscription(caller.uid);
  if (live instanceof Response) return live as NextResponse;
  const sub = await stripe().subscriptions.update(live.subId, { cancel_at_period_end: true });
  return ok({ cancelAtPeriodEnd: sub.cancel_at_period_end, endsAt: endsAt(sub) });
});

function endsAt(sub: { items: { data: { current_period_end: number }[] } }): string | null {
  const t = sub.items.data[0]?.current_period_end;
  return t ? new Date(t * 1000).toISOString() : null;
}
