/**
 * POST /api/v1/admin/news/{id}/notify — push "new article" to the mobile app
 * (FCM topic `all-users`) for a PUBLISHED news doc, once (news.pushedAt guards
 * repeats). Called by the admin publish pages. Replaces the old
 * notifyOnNewsPublish Cloud Function, which never fired (it checked a
 * `published` field news docs don't have). Spec v1.13 Pro §23.
 */
import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';
import { fail, handler, ok, requireUser } from '@/lib/api/v1';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLISHERS = new Set(['admin', 'superadmin', 'newsresearchadmin']);

export const POST = handler('admin/news/notify', async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const db = adminDb();
  const me = (await db.collection('users').doc(caller.uid).get()).data();
  if (!me || !(PUBLISHERS.has(String(me.role)) || me.isAdmin === true)) return fail('forbidden', 403, 'News publishers only.');

  const { id } = await ctx.params;
  const ref = db.collection('news').doc(id);
  // Claim the push in a transaction so two clicks / two pages can't send twice.
  const claim = await db.runTransaction(async (t) => {
    const s = await t.get(ref);
    if (!s.exists) return { error: 'not_found' as const };
    const n = s.data()!;
    if (n.status !== 'published') return { error: 'not_published' as const };
    if (n.pushedAt) return { skipped: true as const };
    t.update(ref, { pushedAt: FieldValue.serverTimestamp() });
    return { title: String(n.title ?? ''), summary: String(n.summary ?? '') };
  });
  if ('error' in claim) return fail(claim.error ?? 'not_found', claim.error === 'not_found' ? 404 : 409);
  if ('skipped' in claim) return ok({ sent: false, reason: 'already_sent' });
  if (!claim.title) return ok({ sent: false, reason: 'no_title' });

  try {
    // adminDb() above initialised the default Admin app, which getMessaging() uses.
    const messageId = await getMessaging().send({
      topic: 'all-users',
      notification: { title: claim.title.slice(0, 120), body: (claim.summary || 'Tap to read more').slice(0, 240) },
      data: { type: 'news', newsId: id },
    });
    return ok({ sent: true, messageId });
  } catch (e) {
    // Release the claim so a retry can send.
    await ref.update({ pushedAt: FieldValue.delete() }).catch(() => undefined);
    console.error('[api/v1 admin/news/notify]', e);
    return fail('push_failed', 502, 'Push notification could not be sent.');
  }
});
