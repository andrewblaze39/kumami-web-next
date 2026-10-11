/** GET /api/v1/plans — public. Plans, prices and referral rewards (docs/API.md). */
import { ok } from '@/lib/api/v1';
import { PLANS, PLAN_IDS } from '@/lib/billing/plans';

export const runtime = 'nodejs';

export function GET() {
  return ok({
    currency: 'usd',
    plans: PLAN_IDS.map((id) => {
      const p = PLANS[id];
      return {
        id, name: p.name, priceCents: p.priceCents, cryptoDays: p.days,
        referralRewardCents: p.referralRewardCents,
        card: { renews: true, interval: id === 'monthly' ? 'month' : 'year' },
        crypto: { renews: false, days: p.days },
      };
    }),
  });
}
