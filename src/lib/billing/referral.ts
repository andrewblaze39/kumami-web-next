/**
 * Referral rewards (spec v1.13 Pro §22, Andrew 11 Oct 2026):
 *  - Both the referrer and the new user are credited the plan's reward
 *    ($1 monthly / $10 yearly) — once per NEW user, on that user's first paid
 *    payment. A referrer has no limit on how many people they bring.
 *  - A refund / chargeback of that payment reverses both credits in full.
 *  - Every balance change is a ledger row; users.referralBalanceCents always
 *    equals the sum of that user's referral_ledger rows.
 * Runs inside the payment transaction (Tx), never on its own.
 */
import { normalizeCode } from './referralCode';
import { PLANS, type PlanId } from './plans';
import type { Tx } from './store';

export type RewardOutcome =
  | { applied: true; rewardId: string; referrerId: string; cents: number }
  | { applied: false; reason: 'no_code' | 'unknown_code' | 'own_code' | 'already_rewarded' | 'not_first_payment' | 'referrer_missing' };

export async function applyReferralReward(
  tx: Tx,
  p: { payerUid: string; code: unknown; plan: PlanId; paymentId: string; isFirstPayment: boolean; now: Date },
): Promise<RewardOutcome> {
  const code = normalizeCode(p.code);
  if (!code) return { applied: false, reason: 'no_code' };
  if (!p.isFirstPayment) return { applied: false, reason: 'not_first_payment' };

  const rewardPath = `referral_rewards/${p.payerUid}`;
  if (await tx.get(rewardPath)) return { applied: false, reason: 'already_rewarded' };

  const codeDoc = await tx.get(`referralCodes/${code}`);
  const referrerId = typeof codeDoc?.userId === 'string' ? codeDoc.userId : null;
  if (!referrerId) return { applied: false, reason: 'unknown_code' };
  if (referrerId === p.payerUid) return { applied: false, reason: 'own_code' };

  const referrer = await tx.get(`users/${referrerId}`);
  if (!referrer) return { applied: false, reason: 'referrer_missing' };
  const payer = (await tx.get(`users/${p.payerUid}`)) ?? {};

  const cents = PLANS[p.plan].referralRewardCents;
  const rewardId = p.payerUid;

  tx.set(rewardPath, {
    referrerId, refereeId: p.payerUid, code, plan: p.plan, paymentId: p.paymentId,
    rewardCentsEach: cents, status: 'credited', createdAt: p.now, reversedAt: null,
  });
  tx.set(`referral_ledger/${rewardId}_referrer`, {
    userId: referrerId, amountCents: cents, type: 'referral_referrer', rewardId, otherUserId: p.payerUid, createdAt: p.now,
  });
  tx.set(`referral_ledger/${rewardId}_referee`, {
    userId: p.payerUid, amountCents: cents, type: 'referral_referee', rewardId, otherUserId: referrerId, createdAt: p.now,
  });
  tx.set(`users/${referrerId}`, {
    referralBalanceCents: num(referrer.referralBalanceCents) + cents,
    referralCount: num(referrer.referralCount) + 1,
  }, { merge: true });
  tx.set(`users/${p.payerUid}`, {
    referralBalanceCents: num(payer.referralBalanceCents) + cents,
    referredBy: referrerId,
  }, { merge: true });
  tx.set(`referralCodes/${code}`, { usageCount: num(codeDoc?.usageCount) + 1 }, { merge: true });

  return { applied: true, rewardId, referrerId, cents };
}

/** Reverse the reward tied to `paymentId` (refund / chargeback). Idempotent. */
export async function reverseReferralReward(
  tx: Tx,
  p: { payerUid: string; paymentId: string; now: Date; reason: 'refund' | 'dispute' },
): Promise<boolean> {
  const rewardPath = `referral_rewards/${p.payerUid}`;
  const reward = await tx.get(rewardPath);
  if (!reward || reward.status !== 'credited' || reward.paymentId !== p.paymentId) return false;

  const cents = num(reward.rewardCentsEach);
  const referrerId = String(reward.referrerId);
  const rewardId = p.payerUid;
  const referrer = (await tx.get(`users/${referrerId}`)) ?? {};
  const payer = (await tx.get(`users/${p.payerUid}`)) ?? {};

  tx.set(rewardPath, { status: 'reversed', reversedAt: p.now, reversalReason: p.reason }, { merge: true });
  tx.set(`referral_ledger/${rewardId}_referrer_reversal`, {
    userId: referrerId, amountCents: -cents, type: 'reversal', rewardId, otherUserId: p.payerUid, reason: p.reason, createdAt: p.now,
  });
  tx.set(`referral_ledger/${rewardId}_referee_reversal`, {
    userId: p.payerUid, amountCents: -cents, type: 'reversal', rewardId, otherUserId: referrerId, reason: p.reason, createdAt: p.now,
  });
  tx.set(`users/${referrerId}`, {
    referralBalanceCents: num(referrer.referralBalanceCents) - cents,
    referralCount: Math.max(0, num(referrer.referralCount) - 1),
  }, { merge: true });
  tx.set(`users/${p.payerUid}`, { referralBalanceCents: num(payer.referralBalanceCents) - cents }, { merge: true });
  return true;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
