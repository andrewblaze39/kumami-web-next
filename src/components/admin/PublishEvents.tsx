'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import AdminPageTour, { proAdminTourSteps } from './AdminPageTour';

/**
 * PublishEvents — admin authoring for the Pro dashboard's Events & Announcements
 * tab. Writes to `pro_events` (pro_* wildcard rule). Each event embeds a YouTube
 * video (by id), can be flagged "live" (shows a Live-now badge + audience Q&A),
 * and is either upcoming or past (past events show as replays).
 */

const STATUSES = ['upcoming', 'past'] as const;
type Status = (typeof STATUSES)[number];

interface EventDoc {
  id: string;
  title: string;
  date: string;
  host: string;
  status: Status;
  live: boolean;
  videoId: string;
  pubStatus: 'published' | 'draft';
}

const EMPTY = { title: '', date: '', host: '', status: 'upcoming' as Status, live: false, videoId: '' };

/** Accept a raw YouTube id or a full URL and return the 11-char id. */
function extractVideoId(input: string): string {
  const s = input.trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return s.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 11);
}

export default function PublishEvents() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pro_events'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, pubStatus: data.pubStatus ?? 'published' } as EventDoc;
    })));
    return () => unsub();
  }, []);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const resetForm = () => { setForm(EMPTY); setEditingId(null); };

  const save = async (pubStatus: 'published' | 'draft') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    if (!form.title.trim()) { setMessage('Title is required.'); return; }
    setLoading(true);
    try {
      const payload = { ...form, videoId: extractVideoId(form.videoId), pubStatus };
      if (editingId) {
        await updateDoc(doc(db, 'pro_events', editingId), { ...payload, updatedAt: serverTimestamp() });
        setMessage('Event updated.');
      } else {
        await addDoc(collection(db, 'pro_events'), { ...payload, createdAt: serverTimestamp(), createdBy: currentUser.uid });
        setMessage(pubStatus === 'published' ? 'Event published!' : 'Draft saved.');
      }
      resetForm();
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setLoading(false); }
  };

  const startEdit = (item: EventDoc) => {
    setEditingId(item.id);
    setForm({ title: item.title, date: item.date, host: item.host, status: item.status, live: item.live, videoId: item.videoId });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'pro_events', id));
      if (editingId === id) resetForm();
      setMessage('Event deleted.');
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const inputCls = 'w-full p-2 border border-gray-300 rounded-md text-black';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-end mb-2"><AdminPageTour steps={proAdminTourSteps('Events & Announcements', '/world/pro?tab=events')} /></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Events &amp; Announcements</h2>
      <p className="text-gray-600 mb-6 text-sm">Live sessions, AMAs and replays shown on the Pro dashboard. Flag one “live” to show a Live-now badge and audience Q&amp;A.</p>

      <form onSubmit={(e) => { e.preventDefault(); save('published'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date / time label</label>
          <input className={inputCls} value={form.date} onChange={(e) => set('date', e.target.value)} placeholder="e.g. Jul 15 · 3:00 PM UTC" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
          <input className={inputCls} value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="e.g. Kumami Research" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className={`${inputCls} bg-white`} value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">YouTube video (id or URL)</label>
          <input className={inputCls} value={form.videoId} onChange={(e) => set('videoId', e.target.value)} placeholder="dQw4w9WgXcQ or full link" />
        </div>
        <div className="md:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={form.live} onChange={(e) => set('live', e.target.checked)} />
            Live now (shows the Live badge + audience Q&amp;A on the tab)
          </label>
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

      <h3 data-tour="admin-list" className="text-lg font-semibold text-gray-900 mb-3">Events ({items.length})</h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-gray-500 text-sm">No events yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{item.title}</span>
                {item.live && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">LIVE</span>}
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.status}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${item.pubStatus === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.pubStatus}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{item.date}{item.host ? ` · ${item.host}` : ''}</p>
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
