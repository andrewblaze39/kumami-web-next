/**
 * In-memory Store for unit tests. Transactions run one at a time (a simple
 * lock), so concurrency tests see serialised, isolated transactions — the
 * same guarantee Firestore gives with retries.
 */
import { BufferedTx, type Doc, type Store } from './store';
import { toMillis } from '@/lib/pro';

export class MemoryStore implements Store {
  readonly docs = new Map<string, Doc>();
  private lock: Promise<unknown> = Promise.resolve();

  seed(path: string, data: Doc): this {
    this.docs.set(path, { ...data });
    return this;
  }

  doc(path: string): Doc | null {
    const d = this.docs.get(path);
    return d ? { ...d } : null;
  }

  /** All docs in a top-level collection: [id, data]. */
  collection(name: string): [string, Doc][] {
    return [...this.docs.entries()]
      .filter(([p]) => p.startsWith(`${name}/`) && p.split('/').length === 2)
      .map(([p, d]) => [p.split('/')[1], { ...d }]);
  }

  async get(path: string): Promise<Doc | null> {
    return this.doc(path);
  }

  runTransaction<T>(fn: (tx: BufferedTx) => Promise<T>): Promise<T> {
    const run = this.lock.then(async () => {
      const tx = new BufferedTx(async (p) => this.doc(p));
      const result = await fn(tx);
      for (const w of tx.writes) {
        const prev = this.docs.get(w.path);
        this.docs.set(w.path, w.merge ? { ...(prev ?? {}), ...w.data } : { ...w.data });
      }
      return result;
    });
    this.lock = run.catch(() => undefined);
    return run;
  }

  async findOne(collection: string, field: string, value: unknown) {
    const hit = this.collection(collection).find(([, d]) => d[field] === value);
    return hit ? { id: hit[0], data: hit[1] } : null;
  }

  async list(collection: string, field: string, value: unknown, orderBy: string, limit: number) {
    return this.collection(collection)
      .filter(([, d]) => d[field] === value)
      .sort(([, a], [, b]) => (toMillis(b[orderBy] as Date) ?? 0) - (toMillis(a[orderBy] as Date) ?? 0))
      .slice(0, limit)
      .map(([id, data]) => ({ id, data }));
  }
}
