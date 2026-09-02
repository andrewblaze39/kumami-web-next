'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Newspaper, Clock, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProShellHead } from './shared';

interface Row { id: string; label: string; meta?: string }

function proHref(tab: string) {
  return `/world/pro?tab=${tab}`;
}

function usePublished(coll: string, map: (id: string, d: Record<string, unknown>) => Row, take = 3) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    const q = query(collection(db, coll), where('status', '==', 'published'));
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.slice(0, take * 4).map((d) => map(d.id, d.data())).slice(0, take));
    }, () => setRows([]));
    return () => unsub();
  }, [coll, take, map]);
  return rows;
}

function Section({ icon, title, tab, rows, empty }: { icon: React.ReactNode; title: string; tab: string; rows: Row[]; empty: string }) {
  return (
    <div className="dig-section">
      <h3>{icon} {title}</h3>
      <div className="apanel" style={{ padding: '6px 20px' }}>
        {rows.length === 0 ? (
          <div className="chart-side-row"><span className="l" style={{ color: 'var(--muted-2)' }}>{empty}</span></div>
        ) : (
          rows.map((r) => (
            <div className="chart-side-row" key={r.id}>
              <span className="l">{r.label}</span>
              {r.meta && <span className="v" style={{ color: 'var(--muted-2)' }}>{r.meta}</span>}
            </div>
          ))
        )}
      </div>
      <Link className="adv-link" href={proHref(tab)}><ArrowRight size={13} /> Open {title}</Link>
    </div>
  );
}

/**
 * Daily Digest — the Pro landing tab. A live roll-up of the other Pro tabs:
 * latest research, news, upcoming calendar events, active airdrops and alpha —
 * each linking out. Smart-money / sentiment summaries arrive with the
 * market-data integration.
 */
export function DailyDigest() {
  const research = usePublished('pro_research', (id, d) => ({ id, label: `${d.name as string} — ${d.pos as string} ${d.asset as string}` }));
  const news = usePublished('pro_news', (id, d) => ({ id, label: d.title as string }));
  const airdrops = usePublished('pro_airdrops', (id, d) => ({ id, label: d.name as string, meta: (d.deadline as string) || undefined }));

  // Upcoming calendar events (client-filtered to today+).
  const [calendar, setCalendar] = useState<Row[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'pro_calendar'), where('status', '==', 'published'));
    const unsub = onSnapshot(q, (snap) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const rows = snap.docs
        .map((d) => ({ id: d.id, t: '', date: '', ...d.data() } as { id: string; t: string; date: string }))
        .filter((e) => typeof e.date === 'string' && e.date !== '' && new Date(e.date) >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3)
        .map((e) => ({ id: e.id, label: e.t, meta: e.date }));
      setCalendar(rows);
    }, () => setCalendar([]));
    return () => unsub();
  }, []);

  // Latest alpha (alphaRoom).
  const [alpha, setAlpha] = useState<Row[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'alphaRoom'), orderBy('timestamp', 'desc'), limit(3));
    const unsub = onSnapshot(q, (snap) => {
      setAlpha(snap.docs
        .map((d) => ({ id: d.id, message: '', isSystem: false, isImage: false, ...d.data() } as { id: string; message: string; isSystem: boolean; isImage: boolean }))
        .filter((m) => !m.isSystem && !m.isImage && m.message)
        .map((m) => ({ id: m.id, label: m.message })));
    }, () => setAlpha([]));
    return () => unsub();
  }, []);

  return (
    <>
      <ProShellHead eyebrow="Cross-cutting" icon={<FileText size={24} />} title="Daily Pro Digest">
        Everything that moved, rolled into one read — your latest research, news, events, airdrops and
        alpha in a single scan.
      </ProShellHead>

      <div className="dig-hero">
        <div>
          <div className="dig-date">Live · updates as content is published</div>
          <h2>Your Pro roundup — the latest across every tab, newest first.</h2>
        </div>
        <Link className="btn btn-surface btn-sm" href={proHref('realtimenews')}>
          <Newspaper size={15} /> All news <ArrowRight size={15} />
        </Link>
      </div>

      <Section icon={<Zap size={16} />} title="Alpha Room" tab="alpha" rows={alpha} empty="No alpha posted yet." />
      <Section icon={<Newspaper size={16} />} title="Real-Time News" tab="realtimenews" rows={news} empty="No headlines yet." />
      <Section icon={<FileText size={16} />} title="Kumami Research" tab="research" rows={research} empty="No research calls yet." />
      <Section icon={<Clock size={16} />} title="Calendar" tab="calendar" rows={calendar} empty="Nothing upcoming." />
      <Section icon={<Sparkles size={16} />} title="Airdrops & Whitelist" tab="airdrops" rows={airdrops} empty="No active airdrops." />

      <div className="apanel" style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
        Smart-money flow and a Fear &amp; Greed read will join this digest once the market-data
        integration is live.
      </div>
    </>
  );
}
