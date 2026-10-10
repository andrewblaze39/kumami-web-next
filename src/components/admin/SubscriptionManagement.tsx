'use client';

/**
 * Subscriptions (superadmin only) — grant or remove Kumami Pro for any user,
 * optionally for a fixed period (Andrew, 10 Oct 2026). Writes go through
 * POST /api/admin/subscription (server checks superadmin + records audit).
 * Reads use the client SDK (rules let superadmins read all users).
 */
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { isProActive, toMillis } from '@/lib/pro';

type Ts = { toMillis(): number } | null | undefined;
interface UserRow {
  id: string;
  email?: string;
  displayName?: string;
  role?: string;
  isPremium?: boolean;
  proUntil?: Ts;
  proSource?: string;
  proGrantedBy?: string;
  proGrantedAt?: Ts;
  subscriptionStatus?: string;
}

const DURATIONS: { label: string; months: number | null }[] = [
  { label: '1 month', months: 1 },
  { label: '3 months', months: 3 },
  { label: '12 months', months: 12 },
  { label: 'No end date', months: null },
];
const PAGE_SIZE = 25;

function fmt(ts: Ts): string {
  const ms = toMillis(ts ?? null);
  return ms ? new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function status(u: UserRow): { label: string; cls: string } {
  if (isProActive(u)) return { label: 'Pro', cls: 'bg-purple-100 text-purple-800' };
  if (u.isPremium === true) return { label: 'Pro expired', cls: 'bg-amber-100 text-amber-800' };
  return { label: 'Free', cls: 'bg-gray-100 text-gray-700' };
}

export default function SubscriptionManagement() {
  const { currentUser, userData } = useAuth();
  const isSuperAdmin = userData?.role === 'superadmin';
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyPro, setOnlyPro] = useState(false);
  const [page, setPage] = useState(0);
  const [months, setMonths] = useState<Record<string, number | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Bump to reload the user list after a grant/remove.
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!isSuperAdmin) return; // the early return below shows a message instead
    let alive = true;
    getDocs(collection(db, 'users'))
      .then((snap) => { if (alive) setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserRow, 'id'>) }))); })
      .catch(() => { if (alive) setMessage({ text: 'Could not load users.', ok: false }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isSuperAdmin, reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => !q || (u.email ?? '').toLowerCase().includes(q) || (u.displayName ?? '').toLowerCase().includes(q))
      .filter((u) => !onlyPro || u.isPremium === true)
      .sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''));
  }, [users, search, onlyPro]);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const act = async (u: UserRow, action: 'grant' | 'remove') => {
    if (!currentUser) return;
    const m = months[u.id] ?? 1;
    const what = action === 'grant'
      ? `Grant Pro to ${u.email} — ${m ? `${m} month${m === 1 ? '' : 's'}` : 'no end date'}?`
      : `Remove Pro from ${u.email}? They lose Pro access immediately.`;
    if (!window.confirm(what)) return;
    setBusy(u.id);
    setMessage(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/admin/subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: u.id, action, months: action === 'grant' ? m : undefined }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? res.statusText);
      setMessage({ text: action === 'grant' ? `Pro granted to ${u.email}.` : `Pro removed from ${u.email}.`, ok: true });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setMessage({ text: `Error: ${err instanceof Error ? err.message : 'failed'}`, ok: false });
    } finally {
      setBusy(null);
    }
  };

  if (!isSuperAdmin) {
    return <div className="p-6 text-gray-700">Only superadmins can manage subscriptions.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Subscriptions</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Grant or remove Kumami Pro for a user. Pro granted here works exactly like a paid subscription; with a duration it
        switches off automatically on the end date. Every change is recorded (who, when).
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="flex-1 min-w-[240px] p-2 border border-gray-300 rounded-md text-black"
          placeholder="Search by email or name"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={onlyPro} onChange={(e) => { setOnlyPro(e.target.checked); setPage(0); }} />
          Pro users only
        </label>
      </div>

      {message && <p className={`mb-3 text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading users…</p>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ends</th>
                  <th className="p-3">Granted by</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => {
                  const st = status(u);
                  const active = isProActive(u);
                  return (
                    <tr key={u.id} className="border-t border-gray-100" data-user-email={u.email}>
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{u.email ?? u.id}</div>
                        <div className="text-xs text-gray-500">{u.displayName ?? '—'} · {u.role ?? 'user'}</div>
                      </td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${st.cls}`}>{st.label}</span></td>
                      <td className="p-3 text-gray-700">
                        {u.isPremium ? (u.proUntil ? fmt(u.proUntil) : u.proSource === 'admin' ? 'No end date' : 'Subscription') : '—'}
                      </td>
                      <td className="p-3 text-gray-700">
                        {u.proGrantedBy ? `${u.proGrantedBy}${u.proGrantedAt ? ` · ${fmt(u.proGrantedAt)}` : ''}` : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          {active ? (
                            <button
                              type="button"
                              disabled={busy === u.id}
                              onClick={() => act(u, 'remove')}
                              className="px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              Remove Pro
                            </button>
                          ) : (
                            <>
                              <select
                                aria-label={`Duration for ${u.email}`}
                                className="p-1.5 border border-gray-300 rounded-md text-black bg-white"
                                value={String(months[u.id] ?? 1)}
                                onChange={(e) => setMonths((m) => ({ ...m, [u.id]: e.target.value === 'null' ? null : Number(e.target.value) }))}
                              >
                                {DURATIONS.map((d) => <option key={d.label} value={String(d.months)}>{d.label}</option>)}
                              </select>
                              <button
                                type="button"
                                disabled={busy === u.id}
                                onClick={() => act(u, 'grant')}
                                className="px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                              >
                                Grant Pro
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-gray-500">No users match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
            <span>{filtered.length} user{filtered.length === 1 ? '' : 's'}</span>
            <span className="flex gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 border rounded disabled:opacity-40">Prev</button>
              <button type="button" disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 border rounded disabled:opacity-40">Next</button>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
