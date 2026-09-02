'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

/**
 * PublishRealTimeNews — admin authoring for the Pro dashboard's Real-Time News
 * tab. Writes to `pro_news` (pro_* wildcard rule). Each item is a headline with
 * a sentiment and optional tags; the timestamp is the server time it was posted.
 * (An automated news-API feed can later write into the same collection.)
 */

const SENTS = ['bull', 'bear', 'neutral'] as const;
type Sent = (typeof SENTS)[number];
const SENT_LABEL: Record<Sent, string> = { bull: 'Bullish', bear: 'Bearish', neutral: 'Neutral' };

interface NewsDoc {
  id: string;
  title: string;
  sentiment: Sent;
  tags: string[];
  source: string;
  status: 'published' | 'draft';
}

const EMPTY = { title: '', sentiment: 'neutral' as Sent, tags: '', source: '' };

export default function PublishRealTimeNews() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<NewsDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pro_news'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, tags: (data.tags || []) } as NewsDoc;
    })));
    return () => unsub();
  }, []);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const resetForm = () => { setForm(EMPTY); setEditingId(null); };

  const save = async (status: 'published' | 'draft') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    if (!form.title.trim()) { setMessage('Headline is required.'); return; }
    setLoading(true);
    try {
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = { title: form.title, sentiment: form.sentiment, tags, source: form.source, status };
      if (editingId) {
        await updateDoc(doc(db, 'pro_news', editingId), { ...payload, updatedAt: serverTimestamp() });
        setMessage('Headline updated.');
      } else {
        await addDoc(collection(db, 'pro_news'), { ...payload, createdAt: serverTimestamp(), createdBy: currentUser.uid });
        setMessage(status === 'published' ? 'Headline published!' : 'Draft saved.');
      }
      resetForm();
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setLoading(false); }
  };

  const startEdit = (item: NewsDoc) => {
    setEditingId(item.id);
    setForm({ title: item.title, sentiment: item.sentiment, tags: (item.tags || []).join(', '), source: item.source || '' });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this headline?')) return;
    try {
      await deleteDoc(doc(db, 'pro_news', id));
      if (editingId === id) resetForm();
      setMessage('Headline deleted.');
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const inputCls = 'w-full p-2 border border-gray-300 rounded-md text-black';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Real-Time News</h2>
      <p className="text-gray-600 mb-6 text-sm">Headlines shown on the Pro dashboard&apos;s Real-Time News tab, newest first.</p>

      <form onSubmit={(e) => { e.preventDefault(); save('published'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
          <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sentiment</label>
          <select className={`${inputCls} bg-white`} value={form.sentiment} onChange={(e) => set('sentiment', e.target.value as Sent)}>
            {SENTS.map((s) => <option key={s} value={s}>{SENT_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source (optional)</label>
          <input className={inputCls} value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="e.g. Reuters" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated, optional)</label>
          <input className={inputCls} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Important, Macro" />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Saving…' : editingId ? 'Update & Publish' : 'Publish'}
          </button>
          <button type="button" onClick={() => save('draft')} disabled={loading} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 disabled:opacity-50">
            {editingId ? 'Save as Draft' : 'Save Draft'}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:text-gray-900">Cancel edit</button>}
        </div>
        {message && <p className={`md:col-span-2 text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
      </form>

      <h3 className="text-lg font-semibold text-gray-900 mb-3">Headlines ({items.length})</h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-gray-500 text-sm">No headlines yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{item.title}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">{SENT_LABEL[item.sentiment]}</span>
                {(item.tags || []).map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{t}</span>)}
                <span className={`text-xs px-2 py-0.5 rounded ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
              </div>
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
