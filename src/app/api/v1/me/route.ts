/**
 * DELETE /api/v1/me — permanently delete the caller's account (docs/API.md).
 * Needs a fresh sign-in (token `auth_time` within 5 minutes). Staff accounts
 * are refused until their role is removed. A live card subscription is
 * cancelled immediately, without a refund. Payment records are kept.
 */
import { fail, handler, ok, rateLimited } from '@/lib/api/v1';
import { adminAuth } from '@/lib/firebase-admin';
import { firestoreStore } from '@/lib/billing/firestoreStore';
import { deleteAccount, deletionBlocker } from '@/lib/account/deletion';
import { deletionDeps } from '@/lib/account/firestoreDeletion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const DELETE = handler('me/delete', async (req: Request) => {
  const h = req.headers.get('Authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  // checkRevoked: a token from before a previous (partial) deletion is refused.
  const decoded = token ? await adminAuth().verifyIdToken(token, true).catch(() => null) : null;
  if (!decoded) return fail('unauthorized', 401, 'Sign in required (Authorization: Bearer <Firebase ID token>).');
  if (rateLimited(`delete:${decoded.uid}`, 5, 60_000)) return fail('rate_limited', 429, 'Too many attempts — try again in a minute.');

  const user = await firestoreStore().get(`users/${decoded.uid}`);
  const block = deletionBlocker(user, decoded.auth_time, Date.now());
  if (block === 'staff_account') return fail('staff_account', 403, 'Staff accounts cannot be deleted here. Ask a superadmin to remove your role first.');
  if (block === 'reauth_required') return fail('reauth_required', 401, 'Please sign in again to confirm it is you.');

  const r = await deleteAccount(decoded.uid, user, deletionDeps());
  console.info(`[api/v1 me/delete] deleted ${decoded.uid}${r.stripeCanceled ? ' (card subscription cancelled)' : ''}`);
  return ok({ deleted: true, stripeCanceled: r.stripeCanceled });
});
