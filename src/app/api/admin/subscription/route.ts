/**
 * POST /api/admin/subscription  { uid, action: 'grant' | 'remove', months?: 1 | 3 | 12 | null }
 *
 * Superadmin-only tool to grant or remove Kumami Pro for a user — backs the
 * admin page /admin/subscriptions (Andrew, 10 Oct 2026). Works in every
 * environment, production included (comps, partners, staff, support fixes).
 *
 *   grant  → users/{uid}: isPremium=true, subscriptionStatus='active',
 *            proSource='admin', proUntil (end date, or null = until removed),
 *            proGrantedBy/At; plus a subscriptions doc (planId 'pro-manual').
 *   remove → users/{uid}: isPremium=false, subscriptionStatus='cancelled-immediate',
 *            proUntil=null, proRemovedBy/At; active manual subscriptions → cancelled.
 * Every change is appended to `admin_audit`.
 *
 * Expiry needs no job: lib/pro.ts isProActive() treats a past proUntil as not Pro
 * (server resolveTier + client AuthContext).
 */
import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_MONTHS = [1, 3, 12];

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  let caller: { uid: string; email?: string };
  try {
    caller = await adminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = adminDb();
  const callerDoc = (await db.collection('users').doc(caller.uid).get()).data();
  if (callerDoc?.role !== 'superadmin') {
    return NextResponse.json({ error: 'superadmin_only' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { uid?: string; action?: string; months?: number | null } | null;
  const uid = body?.uid;
  const action = body?.action;
  if (!uid || (action !== 'grant' && action !== 'remove')) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const months = body?.months ?? null;
  if (action === 'grant' && months !== null && !ALLOWED_MONTHS.includes(months)) {
    return NextResponse.json({ error: 'invalid_duration' }, { status: 400 });
  }

  const userRef = db.collection('users').doc(uid);
  const target = await userRef.get();
  if (!target.exists) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  const now = Date.now();
  const by = caller.email ?? caller.uid;

  if (action === 'grant') {
    let until: Timestamp | null = null;
    if (months) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + months);
      until = Timestamp.fromDate(d);
    }
    await userRef.set({
      isPremium: true,
      subscriptionStatus: 'active',
      proSource: 'admin',
      proUntil: until,
      proGrantedBy: by,
      proGrantedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await db.collection('subscriptions').add({
      userId: uid,
      planName: months ? `Kumami Pro (manual grant, ${months} month${months === 1 ? '' : 's'})` : 'Kumami Pro (manual grant, no end date)',
      planId: 'pro-manual',
      status: 'active',
      startDate: Timestamp.fromMillis(now),
      endDate: until,
      source: 'admin',
      grantedBy: by,
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await userRef.set({
      isPremium: false,
      subscriptionStatus: 'cancelled-immediate',
      proUntil: null,
      proRemovedBy: by,
      proRemovedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    const subs = await db.collection('subscriptions').where('userId', '==', uid).where('status', '==', 'active').get();
    await Promise.all(
      subs.docs
        .filter((d) => d.get('source') === 'admin')
        .map((d) => d.ref.update({ status: 'cancelled-immediate', cancelledAt: FieldValue.serverTimestamp(), cancelledBy: by })),
    );
  }

  await db.collection('admin_audit').add({
    type: 'subscription',
    action,
    months: action === 'grant' ? months : null,
    targetUid: uid,
    targetEmail: target.get('email') ?? null,
    by,
    at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
