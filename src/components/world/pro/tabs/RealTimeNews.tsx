'use client';

import { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProShellHead } from './shared';

const SENT_LABEL: Record<string, string> = { bull: 'Bullish', bear: 'Bearish', neutral: 'Neutral' };
const SENT_CLS: Record<string, string> = { bull: 'green', bear: 'red', neutral: 'neutral' };

interface NewsItem {
  id: string;
  title: string;
  sentiment: 'bull' | 'bear' | 'neutral';
  tags: string[];
  source: string;
  createdAt?: { seconds: number } | null;
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
 * Real-Time News — headlines with timestamp and sentiment, authored from
 * /admin/pro-news (`pro_news`, published only), newest first. An automated
 * news-API feed can later write into the same collection.
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
        Every headline that matters, stripped down to scan speed — timestamp and sentiment, nothing
        else.
      </ProShellHead>

      {loading ? (
        <div className="oc-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="oc-empty">No headlines yet — check back soon.</div>
      ) : (
        items.map((n) => (
          <div className="apanel" style={{ padding: '18px 20px', marginBottom: 16 }} key={n.id}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16.5, fontWeight: 800, lineHeight: 1.35 }}>{n.title}</h3>
            <div style={{ fontSize: 12, color: 'var(--muted-2)', marginBottom: 8 }}>
              {timeAgo(n.createdAt)}{n.source ? ` · ${n.source}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(n.tags || []).map((t) => <span className="oc-tag amber" key={t}>{t}</span>)}
              <span className={`oc-tag ${SENT_CLS[n.sentiment]}`}>{SENT_LABEL[n.sentiment]}</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}
