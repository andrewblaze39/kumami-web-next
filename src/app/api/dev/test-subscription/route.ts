/**
 * POST /api/dev/test-subscription  { action: 'grant' | 'remove' }
 *
 * ⚠️ TEMPORARY TESTING ENDPOINT — REMOVE BEFORE MERGING TO MAIN (Andrew,
 * 10 Oct 2026; tracked in docs/DEVELOPMENT_WORKFLOW.md release checklist).
 * Backs the "Grant Pro" / "Remove Pro" buttons in Profile → Subscription.
 *
 * Simulates what a completed (or cancelled) subscription does for the signed
 * -in user, using the same fields the real flow uses:
 *   grant  → subscriptions/{id} { userId, planName, planId, status:'active',
 *            startDate, endDate (+30d), test:true } and users/{uid}
 *            { isPremium:true, subscriptionStatus:'active' }
 *   remove → the user's test subscriptions → status 'cancelled-immediate';
 *            users/{uid} { isPremium:false, subscriptionStatus:'cancelled-immediate' }
 *
 * Refuses to run in production (NEXT_PUBLIC_ENV=production or the prod
 * Firebase project kumami-6df47) so it can never grant real Pro access.
 */
import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isProduction(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENV === 'production' ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'kumami-6df47'
  );
}

export async function POST(request: Request) {
  if (isProduction()) {
    return NextResponse.json({ error: 'disabled_in_production' }, { status: 403 });
  }
  const authHeader = request.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action;
  if (action !== 'grant' && action !== 'remove') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }

  const db = adminDb();
  const userRef = db.collection('users').doc(uid);
  if (action === 'grant') {
    const now = Date.now();
    await db.collection('subscriptions').add({
      userId: uid,
      planName: 'Kumami Pro (test)',
      planId: 'pro-test',
      status: 'active',
      startDate: Timestamp.fromMillis(now),
      endDate: Timestamp.fromMillis(now + 30 * 86_400_000),
      test: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    await userRef.set({ isPremium: true, subscriptionStatus: 'active' }, { merge: true });
  } else {
    const subs = await db.collection('subscriptions').where('userId', '==', uid).where('test', '==', true).get();
    await Promise.all(subs.docs.map((d) => d.ref.update({ status: 'cancelled-immediate', cancelledAt: FieldValue.serverTimestamp() })));
    await userRef.set({ isPremium: false, subscriptionStatus: 'cancelled-immediate' }, { merge: true });
  }
  return NextResponse.json({ ok: true, isPremium: action === 'grant' });
}
