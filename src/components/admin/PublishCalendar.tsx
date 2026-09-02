'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import AdminPageTour, { proAdminTourSteps } from './AdminPageTour';

/**
 * PublishCalendar — admin authoring for the Pro dashboard's Calendar tab. Each
 * entry is a dated market event (macro print, unlock, upgrade). Writes to
 * `pro_calendar` (covered by the pro_* wildcard rule). Dates are stored as
 * `YYYY-MM-DD` strings so the calendar grid renders them on real days.
 */

const IMPS = ['high', 'med', 'low'] as const;
type Imp = (typeof IMPS)[number];
const IMP_LABEL: Record<Imp, string> = { high: 'High impact', med: 'Medium', low: 'Low' };
const CATS = ['Macro', 'On-chain', 'Regulatory', 'Project', 'Other'];

interface CalDoc {
  id: string;
  t: string;
  date: string; // YYYY-MM-DD
  time: string;
  imp: Imp;
  cat: string;
  d: string;
  status: 'published' | 'draft';
}

const EMPTY = { t: '', date: '', time: '', imp: 'med' as Imp, cat: 'Macro', d: '' };

export default function PublishCalendar() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<CalDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pro_calendar'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CalDoc)));
    return () => unsub();
  }, []);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const resetForm = () => { setForm(EMPTY); setEditingId(null); };

  const save = async (status: 'published' | 'draft') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    if (!form.t.trim() || !form.date) { setMessage('Title and date are required.'); return; }
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'pro_calendar', editingId), { ...form, status, updatedAt: serverTimestamp() });
        setMessage('Event updated.');
      } else {
        await addDoc(collection(db, 'pro_calendar'), { ...form, status, createdAt: serverTimestamp(), createdBy: currentUser.uid });
        setMessage(status === 'published' ? 'Event published!' : 'Draft saved.');
      }
      resetForm();
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setLoading(false); }
  };

  const startEdit = (item: CalDoc) => {
    setEditingId(item.id);
    setForm({ t: item.t, date: item.date, time: item.time, imp: item.imp, cat: item.cat, d: item.d });
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
      <div className="flex justify-end mb-2"><AdminPageTour steps={proAdminTourSteps('Calendar', '/world/pro?tab=calendar')} /></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Calendar</h2>
      <p className="text-gray-600 mb-6 text-sm">Dated market events shown on the Pro dashboard&apos;s Calendar tab.</p>

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Time (optional)</label>
          <input className={inputCls} value={form.time} onChange={(e) => set('time', e.target.value)} placeholder="e.g. 8:30 AM UTC" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
          <select className={`${inputCls} bg-white`} value={form.imp} onChange={(e) => set('imp', e.target.value as Imp)}>
            {IMPS.map((i) => <option key={i} value={i}>{IMP_LABEL[i]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select className={`${inputCls} bg-white`} value={form.cat} onChange={(e) => set('cat', e.target.value)}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
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
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.date}{item.time ? ` · ${item.time}` : ''}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">{IMP_LABEL[item.imp]}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.cat}</span>
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
