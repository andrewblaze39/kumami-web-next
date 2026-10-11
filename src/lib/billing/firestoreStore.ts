import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
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
      const q = await db.collection(collection).where(field, '==', value).orderBy(orderBy, 'desc').limit(limit).get();
      return q.docs.map((d) => ({ id: d.id, data: d.data() as Doc }));
    },
  };
}
