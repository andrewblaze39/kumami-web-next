/**
 * GET /api/v1/referral/me — the caller's referral code (created on first call),
 * share links, paid-referral count, balance and recent ledger rows (spec Pro §22).
 */
import { randomInt } from 'node:crypto';
import { baseUrl, fail, handler, ok, requireUser } from '@/lib/api/v1';
import { firestoreStore } from '@/lib/billing/firestoreStore';
import { PLANS, PLAN_IDS } from '@/lib/billing/plans';
import { ensureReferralCode } from '@/lib/billing/referralCode';
import { toMillis } from '@/lib/pro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler('referral/me', async (req: Request) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const store = firestoreStore();
  const r = await ensureReferralCode(store, caller.uid, (n) => randomInt(n), new Date());
  if (!r.ok) return r.reason === 'user_not_found' ? fail('user_not_found', 404, 'Profile not created yet — retry shortly.') : fail('internal', 500);

  const [user, rows] = await Promise.all([
    store.get(`users/${caller.uid}`),
    store.list('referral_ledger', 'userId', caller.uid, 'createdAt', 50),
  ]);
  const site = process.env.APP_BASE_URL?.replace(/\/+$/, '') || baseUrl(req);
  return ok({
    code: r.code,
    links: { web: `${site}/world/subscribe?ref=${r.code}`, app: `kumami://subscribe?ref=${r.code}` },
    referralCount: num(user?.referralCount),
    balanceCents: num(user?.referralBalanceCents),
    rewards: Object.fromEntries(PLAN_IDS.map((p) => [p, PLANS[p].referralRewardCents])),
    withdrawalsAvailable: false,
    ledger: rows.map(({ id, data }) => ({
      id,
      amountCents: num(data.amountCents),
      type: data.type,
      reason: data.reason ?? null,
      createdAt: new Date(toMillis(data.createdAt as Date) ?? 0).toISOString(),
    })),
  });
});

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
