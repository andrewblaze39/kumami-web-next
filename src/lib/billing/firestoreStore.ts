import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import { toMillis } from '@/lib/pro';
import { BufferedTx, type Doc, type Store } from './store';

/** Production Store: Firestore via the Admin SDK (bypasses security rules). */
export function firestoreStore(): Store {
  const db = adminDb();
  return {
    runTransaction: (fn) =>
      db.runTransaction(async (t) => {
        // A fresh buffer per attempt — Firestore re-runs the callback on contention.
        const tx = new BufferedTx(async (p) => {
          const s = await t.get(db.doc(p));
          return s.exists ? (s.data() as Doc) : null;
        });
        const result = await fn(tx);
        for (const w of tx.writes) {
          if (w.merge) t.set(db.doc(w.path), w.data, { merge: true });
          else t.set(db.doc(w.path), w.data);
        }
        return result;
      }),
    async get(path) {
      const s = await db.doc(path).get();
      return s.exists ? (s.data() as Doc) : null;
    },
    async findOne(collection, field, value) {
      const q = await db.collection(collection).where(field, '==', value).limit(1).get();
      return q.empty ? null : { id: q.docs[0].id, data: q.docs[0].data() as Doc };
    },
    async list(collection, field, value, orderBy, limit) {
      // Sorted in memory (per-user sets are small) so no composite index is needed.
      const q = await db.collection(collection).where(field, '==', value).limit(1000).get();
      return q.docs
        .map((d) => ({ id: d.id, data: d.data() as Doc }))
        .sort((a, b) => (toMillis(b.data[orderBy] as Date) ?? 0) - (toMillis(a.data[orderBy] as Date) ?? 0))
        .slice(0, limit);
    },
  };
}
