/** GET /api/v1/checkout/{orderId} — status of the caller's own order (success page polls it). */
import { fail, handler, ok, requireUser } from '@/lib/api/v1';
import { firestoreStore } from '@/lib/billing/firestoreStore';
import { subscriptionSummary } from '@/lib/billing/summary';
import { safeId } from '@/lib/billing/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler('checkout/[orderId]', async (req: Request, ctx: { params: Promise<{ orderId: string }> }) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const { orderId } = await ctx.params;
  const store = firestoreStore();
  const order = await store.get(`checkout_orders/${safeId(orderId)}`);
  if (!order || order.userId !== caller.uid) return fail('not_found', 404, 'Order not found.');
  const user = await store.get(`users/${caller.uid}`);
  return ok({
    orderId,
    provider: order.provider,
    plan: order.plan,
    status: order.status, // pending | paid | partially_paid | review | failed | expired | refunded
    lastStatus: order.lastStatus ?? null,
    subscription: subscriptionSummary(user, Date.now()),
  });
});
