import 'server-only';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { stripe } from '@/lib/billing/stripeClient';
import type { DeletionDeps } from './deletion';

/** Production deps for deleteAccount: Firestore + Auth via the Admin SDK, Stripe. */
export function deletionDeps(): DeletionDeps {
  const db = adminDb();
  return {
    async cancelStripeSubscription(id) {
      try {
        await stripe().subscriptions.cancel(id);
      } catch (e) {
        // Already cancelled / gone in Stripe — nothing left to stop.
        if ((e as { code?: string }).code !== 'resource_missing') throw e;
      }
    },
    revokeSessions: (uid) => ignoreMissingUser(adminAuth().revokeRefreshTokens(uid)),
    async deleteUserData(uid) {
      // recursiveDelete also removes subcollections (chatrooms/messages,
      // education_progress, pro/state, watchlist).
      await db.recursiveDelete(db.doc(`users/${uid}`));
      await db.recursiveDelete(db.doc(`user_prefs/${uid}`));
      await db.recursiveDelete(db.doc(`watchlists/${uid}`));
      for (const name of ['alerts', 'referralCodes']) {
        const snap = await db.collection(name).where('userId', '==', uid).get();
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = db.batch();
          snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
    },
    deleteAuthUser: (uid) => ignoreMissingUser(adminAuth().deleteUser(uid)),
  };
}

async function ignoreMissingUser(p: Promise<void>): Promise<void> {
  try {
    await p;
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
  }
}
