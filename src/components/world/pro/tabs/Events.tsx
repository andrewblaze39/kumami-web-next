'use client';

import { useEffect, useState } from 'react';
import { Bell, Play, ChevronUp } from 'lucide-react';
import {
  collection, addDoc, doc, increment, onSnapshot, query, updateDoc, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProState } from '../ProState';
import { moderateQuestion, checkAndRecordRateLimit, MAX_QUESTION_LEN } from '@/lib/pro/moderation';
import { ProShellHead } from './shared';

interface ProEvent {
  id: string;
  title: string;
  date: string;
  host: string;
  status: 'upcoming' | 'past';
  live: boolean;
  videoId: string;
}

interface Question {
  id: string;
  text: string;
  votes: number;
}

function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16 / 9', background: '#000', marginBottom: 14 }}>
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        style={{ border: 0, display: 'block' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/** Live event card: embed + realtime audience Q&A (pro_events/{id}/questions). */
function LiveEvent({ event }: { event: ProEvent }) {
  const { hasVoted, markVoted } = useProState();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pro_events', event.id, 'questions'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);
      rows.sort((a, b) => b.votes - a.votes);
      setQuestions(rows);
    });
    return () => unsub();
  }, [event.id]);

  const submit = async () => {
    // Moderate (profanity/links/length) then rate-limit before writing.
    const mod = moderateQuestion(draft);
    if (!mod.ok) { setErr(mod.reason!); return; }
    const rl = checkAndRecordRateLimit();
    if (!rl.ok) { setErr(rl.reason!); return; }
    setErr('');
    setDraft('');
    await addDoc(collection(db, 'pro_events', event.id, 'questions'), {
      text: mod.clean, votes: 1, createdAt: serverTimestamp(),
    });
  };

  const upvote = async (qId: string) => {
    if (hasVoted(qId)) return;
    markVoted(qId);
    await updateDoc(doc(db, 'pro_events', event.id, 'questions', qId), { votes: increment(1) });
  };

  return (
    <div className="apanel" style={{ padding: 20, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span className="oc-tag red"><Play size={12} /> Live now</span>
        <h3 style={{ margin: 0, fontSize: 16 }}>{event.title}</h3>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginBottom: 14 }}>{event.date}{event.host ? ` · ${event.host}` : ''}</div>

      {event.videoId ? (
        <YouTubeEmbed videoId={event.videoId} title={event.title} />
      ) : (
        <div style={{ background: '#000', borderRadius: 12, aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-2)', fontSize: 13, marginBottom: 14 }}>
          <Play size={16} /> Live stream
        </div>
      )}

      <div className="pro-search" style={{ maxWidth: 'none', marginBottom: err ? 4 : 10 }}>
        <input
          placeholder="Submit a question…"
          value={draft}
          maxLength={MAX_QUESTION_LEN}
          onChange={(e) => { setDraft(e.target.value); if (err) setErr(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
      </div>
      {err && <div style={{ fontSize: 12, color: 'var(--bear)', margin: '0 0 10px 2px' }}>{err}</div>}

      {questions.length === 0 ? (
        <div className="oc-empty" style={{ padding: '20px' }}>No questions yet — be the first to ask.</div>
      ) : (
        questions.map((q) => (
          <div className="chart-side-row" key={q.id}>
            <span className="l" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <button className={`followbtn${hasVoted(q.id) ? ' on' : ''}`} style={{ padding: '3px 8px' }} onClick={() => upvote(q.id)}>
                <ChevronUp size={13} /> {q.votes}
              </button>
              {q.text}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function PastEvent({ event }: { event: ProEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="apanel" style={{ padding: 18, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15 }}>{event.title}</h3>
          <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 4 }}>{event.date}{event.host ? ` · ${event.host}` : ''}</div>
        </div>
        {event.videoId && (
          <button className="btn btn-surface btn-sm" onClick={() => setOpen((o) => !o)}>
            <Play size={14} /> {open ? 'Hide' : 'Watch replay'}
          </button>
        )}
      </div>
      {open && event.videoId && <div style={{ marginTop: 14 }}><YouTubeEmbed videoId={event.videoId} title={event.title} /></div>}
    </div>
  );
}

/**
 * Events & Announcements — live sessions and replays authored from
 * /admin/pro-events (`pro_events`, published only). Live events show a Live-now
 * badge, an embedded stream, and realtime audience Q&A.
 */
export function Events() {
  const [events, setEvents] = useState<ProEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'pro_events'), where('pubStatus', '==', 'published'));
    const unsub = onSnapshot(
      q,
      (snap) => { setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProEvent)); setLoading(false); },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const upcoming = events.filter((e) => e.status === 'upcoming');
  const past = events.filter((e) => e.status === 'past');

  return (
    <>
      <ProShellHead eyebrow="Community" icon={<Bell size={24} />} title="Events & Announcements">
        Live sessions and AMAs you can watch, replay and ask questions in — with a live-now badge the
        moment we go on air.
      </ProShellHead>

      {loading ? (
        <div className="oc-empty">Loading…</div>
      ) : events.length === 0 ? (
        <div className="oc-empty">No events yet — check back soon.</div>
      ) : (
        <>
          {upcoming.length > 0 && <div className="cal-day-h">Live &amp; upcoming</div>}
          {upcoming.map((e) =>
            e.live ? (
              <LiveEvent key={e.id} event={e} />
            ) : (
              <div className="apanel" style={{ padding: 18, marginBottom: 12 }} key={e.id}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{e.title}</h3>
                <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 4 }}>{e.date}{e.host ? ` · ${e.host}` : ''}</div>
              </div>
            ),
          )}

          {past.length > 0 && <div className="cal-day-h" style={{ marginTop: 22 }}>Past events</div>}
          {past.map((e) => <PastEvent key={e.id} event={e} />)}
        </>
      )}
    </>
  );
}
