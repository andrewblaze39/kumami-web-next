'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Newspaper, Clock, Sparkles, Zap, ArrowRight, Radar, Eye, Gauge } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProShellHead } from './shared';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import type { CalendarPayload, FearGreedPayload, FlowRadarPayload, WatchlistApiResponse } from '@/lib/market/contracts';
import { digestCalendarRows, digestUsd, topSmartMoneyOpens } from '@/lib/market/rules/digestLines';

interface Row { id: string; label: string; meta?: string }

function proHref(tab: string) {
  return `/world/pro?tab=${tab}`;
}

function usePublished(coll: string, map: (id: string, d: Record<string, unknown>) => Row, take = 3) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    const q = query(collection(db, coll), where('status', '==', 'published'));
    const unsub = onSnapshot(q, (snap) => {
      // Newest first (single-field query → no composite index; sort on the client).
      const secs = (d: { get(f: string): unknown }) => (d.get('createdAt') as { seconds?: number } | null)?.seconds ?? 0;
      const docs = [...snap.docs].sort((x, y) => secs(y) - secs(x));
      setRows(docs.slice(0, take).map((d) => map(d.id, d.data())));
    }, () => setRows([]));
    return () => unsub();
  }, [coll, take, map]);
  return rows;
}

function Section({ icon, title, tab, href, rows, empty }: { icon: React.ReactNode; title: string; tab: string; href?: string; rows: Row[]; empty: string }) {
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
      <Link className="adv-link" href={href ?? proHref(tab)}><ArrowRight size={13} /> Open {title}</Link>
    </div>
  );
}

/**
 * Daily Digest — the Pro landing tab. A live roll-up of the other Pro tabs:
 * latest research, news, upcoming calendar events, active airdrops and alpha —
 * each linking out — plus three market lines (Rachelle v1.15 Pro §1): the top 3
 * Hyperliquid position opens in 24h, today's Also Worth Watching coins, and
 * today's Fear & Greed read.
 */
function useMarketLines() {
  const flow = useMarketEndpoint<FlowRadarPayload>('/api/market/flow-radar?view=pro');
  const watch = useMarketEndpoint<WatchlistApiResponse>('/api/market/watchlist?view=pro');
  const fg = useMarketEndpoint<FearGreedPayload>('/api/market/fear-greed');
  // "Last 24h" is measured from when the tab opened (the feed itself refreshes).
  const [openedAt] = useState(() => Date.now());

  const smartMoney: Row[] = flow.data
    ? topSmartMoneyOpens(flow.data.events, openedAt).map((e) => ({
        id: e.id,
        label: `${e.asset} ${e.side ?? ''} opened`.replace('  ', ' '),
        meta: digestUsd(e.amountUsd),
      }))
    : [];
  const worth: Row[] = (watch.data?.sectionC ?? []).map((a) => ({
    id: a.asset,
    label: a.asset,
    meta: a.reasons[0],
  }));
  const comp = fg.data?.composite;
  const fearGreed: Row[] = comp && !comp.unavailable
    ? [{ id: 'fg', label: comp.label, meta: `${Math.round(comp.score)} / 100` }]
    : [];
  const status = (s: string) => (s === 'loading' ? 'Loading…' : 'Unavailable right now.');
  return {
    smartMoney, worth, fearGreed,
    smartEmpty: flow.data ? 'No large position opens in the last 24h.' : status(flow.status),
    worthEmpty: watch.data ? 'No coin shows sustained accumulation right now.' : status(watch.status),
    fgEmpty: fg.data ? 'No Fear & Greed read right now.' : status(fg.status),
  };
}

export function DailyDigest() {
  const m = useMarketLines();
  const research = usePublished('pro_research', (id, d) => ({ id, label: `${d.name as string} — ${d.pos as string} ${d.asset as string}` }));
  const news = usePublished('pro_news', (id, d) => ({ id, label: d.title as string }));
  const airdrops = usePublished('pro_airdrops', (id, d) => ({ id, label: d.name as string, meta: (d.deadline as string) || undefined }));

  // Upcoming team calendar events, from the tier-filtered calendar route (audience flags +
  // Pro-only airdrops applied server-side) rather than reading pro_calendar directly.
  const cal = useMarketEndpoint<CalendarPayload>('/api/market/calendar?view=pro');
  const [openedAt] = useState(() => Date.now());
  const calendar: Row[] = cal.data ? digestCalendarRows(cal.data.events, openedAt) : [];

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
        Everything that moved, rolled into one read — your latest research, news, events, airdrops,
        alpha, smart money and market mood in a single scan.
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

      <Section icon={<Radar size={16} />} title="Smart Money" tab="flowradar" rows={m.smartMoney} empty={m.smartEmpty} />
      <Section icon={<Eye size={16} />} title="Also Worth Watching" tab="watchlist" rows={m.worth} empty={m.worthEmpty} />
      <Section icon={<Gauge size={16} />} title="Fear & Greed" tab="" href="/world/fear-greed" rows={m.fearGreed} empty={m.fgEmpty} />
    </>
  );
}
