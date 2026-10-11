/**
 * Minimal document-store abstraction for the billing core, so the money logic
 * (webhooks, referral rewards, codes) runs identically on Firestore in
 * production and on an in-memory store in unit tests.
 *
 * A transaction buffers its writes and applies them when the callback
 * returns. Reads see the transaction's own buffered writes, so callers can
 * read-modify-write freely; Firestore's "all reads before writes" rule is met
 * because no write reaches Firestore until the end.
 */

export type Doc = Record<string, unknown>;

export interface Tx {
  get(path: string): Promise<Doc | null>;
  /** Replace (or with merge, shallow-merge into) the doc at `path`. */
  set(path: string, data: Doc, opts?: { merge?: boolean }): void;
}

export interface Store {
  runTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  get(path: string): Promise<Doc | null>;
  /** Simple equality query on one collection (outside a transaction). */
  findOne(collection: string, field: string, value: unknown): Promise<{ id: string; data: Doc } | null>;
  /** Equality query, newest first by `orderBy` (desc), up to `limit`. */
  list(collection: string, field: string, value: unknown, orderBy: string, limit: number): Promise<{ id: string; data: Doc }[]>;
}

export interface Write { path: string; data: Doc; merge: boolean }

export class BufferedTx implements Tx {
  readonly writes: Write[] = [];
  /**
   * The transaction's view of each touched doc. `complete` = the full doc is
   * known (read from the store, or replaced by a non-merge set); otherwise
   * `data` holds only merged fields, layered onto the stored doc at next read.
   */
  private view = new Map<string, { data: Doc | null; complete: boolean }>();

  constructor(private readonly read: (path: string) => Promise<Doc | null>) {}

  async get(path: string): Promise<Doc | null> {
    const v = this.view.get(path);
    if (v?.complete) return clone(v.data);
    const base = await this.read(path);
    const data = v ? { ...(base ?? {}), ...(v.data ?? {}) } : base;
    this.view.set(path, { data, complete: true });
    return clone(data);
  }

  set(path: string, data: Doc, opts: { merge?: boolean } = {}): void {
    assertPath(path);
    const merge = opts.merge === true;
    this.writes.push({ path, data: { ...data }, merge });
    const v = this.view.get(path);
    if (!merge) this.view.set(path, { data: { ...data }, complete: true });
    else this.view.set(path, { data: { ...(v?.data ?? {}), ...data }, complete: v?.complete ?? false });
  }
}

function clone(d: Doc | null): Doc | null {
  return d ? { ...d } : null;
}

export function assertPath(path: string): void {
  const parts = path.split('/');
  if (parts.length % 2 !== 0 || parts.some((p) => !p)) throw new Error(`Invalid document path: ${path}`);
}

/** Firestore doc ids may not contain "/"; keep provider ids safe. */
export function safeId(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]/g, '_');
}
