'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import AdminPageTour, { proAdminTourSteps } from './AdminPageTour';

/**
 * PublishKumamiResearch — admin authoring for the Pro dashboard's "Kumami
 * Research" tab. Each entry is a KOL-led call with a stated position, asset and
 * a "what this means for you" note. Writes to the `pro_research` collection,
 * which the Pro tab reads (status === 'published'). Supports create, edit,
 * delete and draft/publish.
 */

const POSITIONS = ['long', 'short', 'neutral'] as const;
type Position = (typeof POSITIONS)[number];

interface ResearchDoc {
  id: string;
  name: string;
  role: string;
  pos: Position;
  asset: string;
  body: string;
  forYou: string;
  status: 'published' | 'draft';
}

const EMPTY = { name: '', role: '', pos: 'long' as Position, asset: '', body: '', forYou: '' };

export default function PublishKumamiResearch() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<ResearchDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pro_research'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ResearchDoc));
    });
    return () => unsub();
  }, []);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const save = async (status: 'published' | 'draft') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    if (!form.name.trim() || !form.body.trim()) {
      setMessage('Analyst name and the call body are required.');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'pro_research', editingId), {
          ...form, status, updatedAt: serverTimestamp(),
        });
        setMessage('Research call updated.');
      } else {
        await addDoc(collection(db, 'pro_research'), {
          ...form, status, createdAt: serverTimestamp(), createdBy: currentUser.uid,
        });
        setMessage(status === 'published' ? 'Research call published!' : 'Draft saved.');
      }
      resetForm();
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: ResearchDoc) => {
    setEditingId(item.id);
    setForm({ name: item.name, role: item.role, pos: item.pos, asset: item.asset, body: item.body, forYou: item.forYou });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this research call? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'pro_research', id));
      if (editingId === id) resetForm();
      setMessage('Research call deleted.');
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const inputCls = 'w-full p-2 border border-gray-300 rounded-md text-black';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-end mb-2"><AdminPageTour steps={proAdminTourSteps('Kumami Research', '/world/pro?tab=research')} /></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Kumami Research</h2>
      <p className="text-gray-600 mb-6 text-sm">
        KOL-led calls shown on the Pro dashboard&apos;s Research tab. Each needs a stated position and asset.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); save('published'); }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Analyst name</label>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role / title</label>
          <input className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Senior Analyst, Kumami Research" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
          <select className={`${inputCls} bg-white`} value={form.pos} onChange={(e) => set('pos', e.target.value as Position)}>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asset / ticker</label>
          <input className={inputCls} value={form.asset} onChange={(e) => set('asset', e.target.value.toUpperCase())} placeholder="BTC" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">The call</label>
          <textarea className={`${inputCls} h-28`} value={form.body} onChange={(e) => set('body', e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">What this means for you</label>
          <textarea className={`${inputCls} h-24`} value={form.forYou} onChange={(e) => set('forYou', e.target.value)} placeholder="How this relates to a typical user's holdings / watchlist." />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button type="submit" data-tour="admin-publish" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Saving…' : editingId ? 'Update & Publish' : 'Publish'}
          </button>
          <button type="button" data-tour="admin-draft" onClick={() => save('draft')} disabled={loading} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 disabled:opacity-50">
            {editingId ? 'Save as Draft' : 'Save Draft'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              Cancel edit
            </button>
          )}
        </div>
        {message && (
          <p className={`md:col-span-2 text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
        )}
      </form>

      <h3 data-tour="admin-list" className="text-lg font-semibold text-gray-900 mb-3">Existing calls ({items.length})</h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-gray-500 text-sm">No research calls yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{item.name}</span>
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.pos} {item.asset}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.body}</p>
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
