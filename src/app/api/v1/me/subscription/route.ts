/** GET /api/v1/me/subscription — the caller's Pro status (docs/API.md). */
import { handler, ok, requireUser } from '@/lib/api/v1';
import { firestoreStore } from '@/lib/billing/firestoreStore';
import { subscriptionSummary } from '@/lib/billing/summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler('me/subscription', async (req: Request) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const user = await firestoreStore().get(`users/${caller.uid}`);
  return ok(subscriptionSummary(user, Date.now()));
});
