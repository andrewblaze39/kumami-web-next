'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProShellHead } from './shared';

interface ResearchCall {
  id: string;
  name: string;
  role: string;
  pos: 'long' | 'short' | 'neutral';
  asset: string;
  body: string;
  forYou: string;
  createdAt?: { seconds: number } | null;
}

/**
 * Kumami Research — KOL-led calls, each with a stated position, asset and a
 * "what this means for you" read. Content is authored from /admin/pro-research
 * and stored in the `pro_research` collection (published entries only).
 */
export function KumamiResearch() {
  const [calls, setCalls] = useState<ResearchCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Filter to published on the server (single-field where — no composite
    // index needed) and sort newest-first on the client.
    const q = query(collection(db, 'pro_research'), where('status', '==', 'published'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ResearchCall);
        rows.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setCalls(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  return (
    <>
      <ProShellHead eyebrow="News & Signals" icon={<FileText size={24} />} title="Kumami Research">
        KOL-led calls with a stated position and timestamp built in — accountability by design, not
        vague sentiment.
      </ProShellHead>

      {loading ? (
        <div className="oc-empty">Loading research…</div>
      ) : calls.length === 0 ? (
        <div className="oc-empty">No research calls yet — check back soon.</div>
      ) : (
        calls.map((k) => (
          <div className="ma-card" key={k.id}>
            <div className="ma-top">
              <div>
                <div className="ma-name">{k.name}</div>
                <div className="ma-role">{k.role}</div>
              </div>
              <span className="ma-time">{timeAgo(k.createdAt)}</span>
              <span className={`ma-pos ${k.pos}`} style={{ margin: 0 }}>
                {k.pos} {k.asset}
              </span>
            </div>
            <p className="ma-body">{k.body}</p>
            {k.forYou && (
              <div className="ma-premium">
                <b>What this means for you</b>
                {k.forYou}
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}

function timeAgo(ts?: { seconds: number } | null): string {
  if (!ts?.seconds) return '';
  const diff = Date.now() / 1000 - ts.seconds;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
