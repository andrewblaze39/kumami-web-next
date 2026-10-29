'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc,
  type Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import AdminPageTour, { proAdminTourSteps } from './AdminPageTour';
import {
  adminCalendarFields, audienceError, audienceFormState, DEFAULT_AUDIENCE, missingTokenSaleFields, parseAdminWhen, TOKEN_SALE,
  type AdminCalendarForm,
} from '@/lib/market/rules/calendarEvents';

/**
 * PublishCalendar — admin authoring for the shared Calendar (/world/calendar,
 * seen by Plus AND Pro). Published entries are merged server-side with the
 * market-data feed (macro prints + token unlocks) — see
 * lib/market/live/calendarPage.ts. Drafts never show; edits and deletes show
 * on the user's next load. Writes to `pro_calendar` (covered by the pro_*
 * wildcard rule — the collection name is historical).
 *
 * Fields: date `YYYY-MM-DD`; time `HH:MM` in UTC (blank = all-day); assets =
 * comma-separated tickers; audience = who sees it ({ plus, pro }, at least one
 * on; new events default to both). There is no category control any more
 * (calendar PRD, 28 Oct 2026): new events show under "Protocol & other", and a
 * legacy doc keeps its stored `cat` (Macro / Token unlock / Token sale) on edit.
 * Legacy docs without `audience` are shown to both tiers and load as both on.
 * HIGH-impact events trigger the "high-impact event soon" popups in the 24h
 * before, for the tiers that can see them.
 */

const IMPS = ['high', 'med', 'low'] as const;
type Imp = (typeof IMPS)[number];
const IMP_LABEL: Record<Imp, string> = { high: 'High impact', med: 'Medium', low: 'Low' };

/** Importance guide for the team (Rachelle v1.15 Plus §5). */
const IMPORTANCE_GUIDE: { imp: string; text: string }[] = [
  { imp: 'High', text: 'CPI, PCE, NFP, FOMC decision or press conference, BoJ decision; unlocks ≥ 5% of circulating or ≥ $100M; Binance or Coinbase spot listings; tier-1 token sales. Only High events trigger the popups and the Console badge.' },
  { imp: 'Medium', text: 'PPI, GDP, Retail Sales, ISM, JOLTS, FOMC Minutes, Fed Chair; ECB / BoE / PBoC decisions; unlocks ≥ 2% or ≥ $25M; OKX / Bybit / Upbit spot listings.' },
  { imp: 'Low', text: 'Everything else (hidden on the Calendar unless the user turns LOW on).' },
];

/** Legacy docs stored free-text times ("8:30 AM UTC") — normalise to HH:MM for the time picker. */
function toPickerTime(date: string, time: string | undefined): string {
  if (!time) return '';
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  const when = parseAdminWhen(date || '2000-01-01', time);
  return when && !when.allDay ? when.ts.slice(11, 16) : '';
}

interface CalDoc {
  id: string;
  t: string;
  date: string; // YYYY-MM-DD
  time: string;
  imp: Imp;
  cat?: string; // legacy docs only
  d: string;
  assets?: string;
  venue?: string;
  raise?: string;
  link?: string;
  audience?: { plus?: boolean; pro?: boolean };
  status: 'published' | 'draft';
}

type Form = AdminCalendarForm & { imp: Imp };
const EMPTY: Form = { t: '', date: '', time: '', imp: 'med', d: '', assets: '', venue: '', raise: '', link: '', audience: { ...DEFAULT_AUDIENCE } };

/** One audience switch (Plus or Pro). */
function AudienceSwitch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer select-none">
      <input type="checkbox" className="h-4 w-4" checked={on} onChange={(e) => onChange(e.target.checked)} aria-label={`Show to ${label}`} />
      {label}
    </label>
  );
}

function audienceLabel(a: CalDoc['audience']): string {
  const s = audienceFormState(a);
  return s.plus && s.pro ? 'Plus + Pro' : s.plus ? 'Plus only' : 'Pro only';
}

/** pro_settings/calendar — automatic CoinGlass feeds on the Calendar (both OFF by default). */
type FeedSettings = { macroFeed?: boolean; unlockFeed?: boolean; updatedBy?: string; updatedAt?: Timestamp };

function FeedSwitch({ label, help, on, busy, onChange }: { label: string; help: string; on: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={busy}
        onClick={() => onChange(!on)}
        className={`mt-0.5 relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-gray-300'} disabled:opacity-50`}
      >
        <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      <span>
        <span className="block text-sm font-semibold text-gray-900">{label} — {busy ? 'Saving…' : on ? 'ON' : 'OFF'}</span>
        <span className="block text-xs text-gray-600">{help}</span>
      </span>
    </label>
  );
}

export default function PublishCalendar() {
  const { currentUser } = useAuth();
  const [feeds, setFeeds] = useState<FeedSettings>({});
  const [feedBusy, setFeedBusy] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'pro_settings', 'calendar'), (snap) => setFeeds((snap.data() as FeedSettings) ?? {}));
    return () => unsub();
  }, []);

  const setFeed = async (key: 'macroFeed' | 'unlockFeed', value: boolean) => {
    if (!currentUser) return;
    setFeedBusy(true);
    try {
      await setDoc(doc(db, 'pro_settings', 'calendar'), {
        [key]: value, updatedBy: currentUser.email ?? currentUser.uid, updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setFeedBusy(false); }
  };
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<CalDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pro_calendar'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CalDoc)));
    return () => unsub();
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setAudience = (tier: 'plus' | 'pro', v: boolean) => setForm((f) => ({ ...f, audience: { ...f.audience, [tier]: v } }));
  const resetForm = () => { setForm(EMPTY); setEditingId(null); };

  const save = async (status: 'published' | 'draft') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    if (!form.t.trim() || !form.date) { setMessage('Title and date are required.'); return; }
    const noAudience = audienceError(form.audience);
    if (noAudience) { setMessage(noAudience); return; }
    const missing = status === 'published' ? missingTokenSaleFields(form) : [];
    if (missing.length) { setMessage(`A token sale needs: ${missing.join(', ')}.`); return; }
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'pro_calendar', editingId), { ...adminCalendarFields(form), status, updatedAt: serverTimestamp() });
        setMessage('Event updated.');
      } else {
        await addDoc(collection(db, 'pro_calendar'), { ...adminCalendarFields(form), status, createdAt: serverTimestamp(), createdBy: currentUser.uid });
        setMessage(status === 'published' ? 'Event published!' : 'Draft saved.');
      }
      resetForm();
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setLoading(false); }
  };

  const startEdit = (item: CalDoc) => {
    setEditingId(item.id);
    setForm({
      t: item.t, date: item.date, time: toPickerTime(item.date, item.time), imp: item.imp,
      d: item.d, assets: item.assets ?? '',
      venue: item.venue ?? '', raise: item.raise ?? '', link: item.link ?? '',
      ...(item.cat ? { cat: item.cat } : {}),
      audience: audienceFormState(item.audience),
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'pro_calendar', id));
      if (editingId === id) resetForm();
      setMessage('Event deleted.');
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const inputCls = 'w-full p-2 border border-gray-300 rounded-md text-black';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-end mb-2"><AdminPageTour steps={proAdminTourSteps('Calendar', '/world/calendar')} /></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Calendar</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Events you publish here appear on the Calendar for the users you choose (Plus, Pro or both), next to the
        automatic macro and token-unlock events when those feeds are switched on below. Drafts stay hidden.
        High-impact events trigger a reminder popup 24h before.
      </p>

      <section data-tour="admin-feeds" className="mb-8">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Automatic feeds</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FeedSwitch
            label="Macro events (CoinGlass)"
            help="CPI, FOMC, jobs data and other economic releases, added automatically."
            on={feeds.macroFeed === true}
            busy={feedBusy}
            onChange={(v) => setFeed('macroFeed', v)}
          />
          <FeedSwitch
            label="Token unlocks (CoinGlass)"
            help="Token unlocks happening today, added automatically."
            on={feeds.unlockFeed === true}
            busy={feedBusy}
            onChange={(v) => setFeed('unlockFeed', v)}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          While a feed is OFF, its events disappear everywhere (Calendar page, Console preview, high-impact popups).
          {feeds.updatedBy ? ` Last changed by ${feeds.updatedBy}${feeds.updatedAt ? ` · ${feeds.updatedAt.toDate().toLocaleString()}` : ''}.` : ' Both are OFF by default.'}
        </p>
      </section>

      <form onSubmit={(e) => { e.preventDefault(); save('published'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input className={inputCls} value={form.t} onChange={(e) => set('t', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" className={inputCls} value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time in UTC (optional — blank = all day)</label>
          <input type="time" className={inputCls} value={form.time} onChange={(e) => set('time', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
          <select className={`${inputCls} bg-white`} value={form.imp} onChange={(e) => set('imp', e.target.value as Imp)}>
            {IMPS.map((i) => <option key={i} value={i}>{IMP_LABEL[i]}</option>)}
          </select>
        </div>
        <fieldset data-tour="admin-audience">
          <legend className="block text-sm font-medium text-gray-700 mb-1">Who sees this event</legend>
          <div className="flex gap-6 p-2">
            <AudienceSwitch label="Plus" on={form.audience.plus} onChange={(v) => setAudience('plus', v)} />
            <AudienceSwitch label="Pro" on={form.audience.pro} onChange={(v) => setAudience('pro', v)} />
          </div>
          <p className={`text-xs mt-1 ${audienceError(form.audience) ? 'text-red-600' : 'text-gray-500'}`}>
            {audienceError(form.audience) ?? 'At least one is required. New events start with both on.'}
          </p>
        </fieldset>
        <details className="md:col-span-2 text-sm text-gray-700 border border-gray-200 rounded-md p-3">
          <summary className="cursor-pointer font-medium text-gray-900">Which impact should I pick?</summary>
          <ul className="mt-2 space-y-1">
            {IMPORTANCE_GUIDE.map((g) => <li key={g.imp}><b>{g.imp}:</b> {g.text}</li>)}
          </ul>
        </details>
        {form.cat === TOKEN_SALE && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue (launchpad / exchange)</label>
              <input className={inputCls} value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="e.g. Binance Launchpool" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raise or FDV</label>
              <input className={inputCls} value={form.raise} onChange={(e) => set('raise', e.target.value)} placeholder="e.g. $12M raise · $400M FDV" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Official link</label>
              <input className={inputCls} value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://…" />
              <p className="text-xs text-gray-500 mt-1">A token sale needs the project (title), ticker (assets), date, time in UTC, venue, raise or FDV, and this link.</p>
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">{form.cat === TOKEN_SALE ? 'Ticker' : 'Affected assets (optional)'}</label>
          <input
            className={inputCls}
            value={form.assets}
            onChange={(e) => set('assets', e.target.value)}
            placeholder="e.g. BTC, ETH — powers the asset filter; blank Macro events count as market-wide"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className={`${inputCls} h-20`} value={form.d} onChange={(e) => set('d', e.target.value)} />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button type="submit" data-tour="admin-publish" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Saving…' : editingId ? 'Update & Publish' : 'Publish'}
          </button>
          <button type="button" data-tour="admin-draft" onClick={() => save('draft')} disabled={loading} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 disabled:opacity-50">
            {editingId ? 'Save as Draft' : 'Save Draft'}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:text-gray-900">Cancel edit</button>}
        </div>
        {message && <p className={`md:col-span-2 text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
      </form>

      <h3 data-tour="admin-list" className="text-lg font-semibold text-gray-900 mb-3">Scheduled events ({items.length})</h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-gray-500 text-sm">No events yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{item.t}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.date}{item.time ? ` · ${item.time}${/^\d{2}:\d{2}$/.test(item.time) ? ' UTC' : ''}` : ' · all day'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">{IMP_LABEL[item.imp]}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700">{audienceLabel(item.audience)}</span>
                {item.cat && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.cat}</span>}
                {item.assets && <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.assets}</span>}
                <span className={`text-xs px-2 py-0.5 rounded ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
              </div>
              {item.d && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.d}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => startEdit(item)} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 text-gray-800">Edit</button>
              <button onClick={() => remove(item.id)} className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
