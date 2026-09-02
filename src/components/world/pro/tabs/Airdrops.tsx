'use client';

import { useEffect, useState } from 'react';
import { Sparkles, ArrowLeft, Check, X, Bookmark } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProState } from '../ProState';
import { ProShellHead } from './shared';

interface ChecklistRow { t: string; ok: boolean }
interface Airdrop {
  id: string;
  name: string;
  cat: 'airdrop' | 'whitelist';
  desc: string;
  deadline: string;
  val: string;
  elig: 'eligible' | 'check' | 'notlive';
  color: string;
  checklist: ChecklistRow[];
  createdAt?: { seconds: number } | null;
}

const ELIG_LABEL: Record<string, string> = {
  eligible: 'Eligible',
  check: 'Check eligibility',
  notlive: 'Not live',
};

/**
 * Airdrops & Whitelist — a curated, admin-authored list of drops and whitelist
 * opportunities (from /admin/pro-airdrops → `pro_airdrops`, published only),
 * split by category, each with an eligibility checklist and a follow toggle.
 */
export function Airdrops() {
  const [tab, setTab] = useState<'airdrop' | 'whitelist'>('airdrop');
  const [selId, setSelId] = useState<string | null>(null);
  const [items, setItems] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFollowing, toggleFollow } = useProState();

  useEffect(() => {
    const q = query(collection(db, 'pro_airdrops'), where('status', '==', 'published'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Airdrop);
        rows.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setItems(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const selected = selId ? items.find((a) => a.id === selId) : null;

  if (selected) {
    const followKey = `airdrop:${selected.id}`;
    const on = isFollowing(followKey);
    return (
      <>
        <ProShellHead eyebrow="Tools" icon={<Sparkles size={24} />} title={selected.name}>
          {selected.desc}
        </ProShellHead>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setSelId(null)}>
          <ArrowLeft size={15} /> Back to list
        </button>
        <div className="ad-detail">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <span className={`ad-elig ${selected.elig}`}>{ELIG_LABEL[selected.elig]}</span>
            <button className={`followbtn${on ? ' on' : ''}`} onClick={() => toggleFollow(followKey)}>
              {on ? <Check size={13} /> : <Bookmark size={13} />} {on ? 'Following' : 'Follow'}
            </button>
          </div>
          {selected.checklist?.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--muted-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                Eligibility checklist
              </div>
              {selected.checklist.map((r, i) => (
                <div className="ad-check-row" key={i}>
                  <span style={{ color: r.ok ? 'var(--bull)' : 'var(--bear)', display: 'inline-flex' }}>
                    {r.ok ? <Check size={16} /> : <X size={16} />}
                  </span>
                  <span>{r.t}</span>
                </div>
              ))}
            </>
          )}
          <div className="chart-side-row" style={{ marginTop: 8 }}>
            <span className="l">Deadline</span>
            <span className="v" style={{ color: 'var(--pro)' }}>{selected.deadline || '—'}</span>
          </div>
          <div className="chart-side-row">
            <span className="l">Estimated value</span>
            <span className="v">{selected.val || '—'}</span>
          </div>
        </div>
      </>
    );
  }

  const list = items.filter((a) => a.cat === tab);

  return (
    <>
      <ProShellHead eyebrow="Tools" icon={<Sparkles size={24} />} title="Airdrops & Whitelist">
        Curated drops and whitelist access, tracked with an eligibility checklist and deadline for
        each — follow the ones you care about.
      </ProShellHead>

      <div className="pro-toolbar">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['airdrop', 'whitelist'] as const).map((t) => (
            <button key={t} className={`btn btn-sm ${tab === t ? 'btn-pro' : 'btn-surface'}`} onClick={() => setTab(t)}>
              {t === 'airdrop' ? 'Airdrops' : 'Whitelists'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="oc-empty">Loading…</div>
      ) : list.length === 0 ? (
        <div className="oc-empty">
          No {tab === 'airdrop' ? 'airdrops' : 'whitelists'} yet — check back soon.
        </div>
      ) : (
        <div className="ad-grid">
          {list.map((a) => (
            <div className="ad-card" key={a.id} onClick={() => setSelId(a.id)}>
              <div className="ad-card-top">
                <span className="logo" style={{ background: a.color || '#5ee9a8' }}>{a.name.charAt(0)}</span>
                <span className={`ad-elig ${a.elig}`}>{ELIG_LABEL[a.elig]}</span>
              </div>
              <h3>{a.name}</h3>
              <p>{a.desc}</p>
              <div className="ad-foot">
                <span className="cd">{a.deadline || '—'}</span>
                <span className="val">{a.val || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
