'use client';

import { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProShellHead } from './shared';

const SENT_LABEL: Record<string, string> = { bull: 'Bullish', bear: 'Bearish', neutral: 'Neutral' };
const SENT_COLOR: Record<string, string> = { bull: 'var(--bull)', bear: 'var(--bear)', neutral: 'var(--muted-2)' };

interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  sentiment: 'bull' | 'bear' | 'neutral';
  tags: string[];
  source: string;
  createdAt?: { seconds: number } | null;
}

function fmtClock(ts?: { seconds: number } | null): string {
  if (!ts?.seconds) return '--:--';
  return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function timeAgo(ts?: { seconds: number } | null): string {
  if (!ts?.seconds) return 'just now';
  const diff = Date.now() / 1000 - ts.seconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Real-Time News — a compact scannable feed: a prominent left timestamp column
 * (HH:MM + relative time) beside each headline, a one-line summary, and tags.
 * Authored from /admin/pro-news (`pro_news`, published only), newest first.
 */
export function RealTimeNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'pro_news'), where('status', '==', 'published'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, ...data, tags: data.tags || [] } as NewsItem;
        });
        rows.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setItems(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  return (
    <>
      <ProShellHead eyebrow="News & Signals" icon={<Newspaper size={24} />} title="Real-Time News">
        Every headline that matters, stripped down to scan speed — a clear timestamp, sentiment, and
        nothing else in the way.
      </ProShellHead>

      {loading ? (
        <div className="oc-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="oc-empty">No headlines yet — check back soon.</div>
      ) : (
        <div className="rtn-list">
          {items.map((n) => (
            <div className="rtn-row" key={n.id}>
              <div className="rtn-time">
                <b>{fmtClock(n.createdAt)}</b>
                <span>{timeAgo(n.createdAt)}</span>
              </div>
              <div className="rtn-main">
                <h3 className="rtn-title">
                  <span className="rtn-dot" style={{ background: SENT_COLOR[n.sentiment] }} />
                  <span className="t">{n.title}</span>
                </h3>
                {n.summary && <p className="rtn-sum">{n.summary}</p>}
                <div className="rtn-tags">
                  {(n.tags || []).map((t) => (
                    <span className="oc-tag amber" key={t}>{t}</span>
                  ))}
                  <span className={`oc-tag ${n.sentiment === 'bull' ? 'green' : n.sentiment === 'bear' ? 'red' : 'neutral'}`}>
                    {SENT_LABEL[n.sentiment]}
                  </span>
                  {n.source && <span className="oc-tag neutral">{n.source}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
