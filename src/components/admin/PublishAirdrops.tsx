'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import AdminPageTour, { proAdminTourSteps } from './AdminPageTour';

/**
 * PublishAirdrops — admin authoring for the Pro dashboard's "Airdrops &
 * Whitelist" tab. Each entry is a curated drop or whitelist opportunity with an
 * eligibility checklist, deadline and estimated value. Writes to `pro_airdrops`
 * (covered by the pro_* wildcard rule). Supports create/edit/delete + draft.
 */

const CATS = ['airdrop', 'whitelist'] as const;
type Cat = (typeof CATS)[number];
const ELIGS = ['eligible', 'check', 'notlive'] as const;
type Elig = (typeof ELIGS)[number];
const ELIG_LABEL: Record<Elig, string> = { eligible: 'Eligible', check: 'Check eligibility', notlive: 'Not live' };

interface ChecklistRow { t: string; ok: boolean }

interface AirdropDoc {
  id: string;
  name: string;
  cat: Cat;
  desc: string;
  deadline: string;
  val: string;
  elig: Elig;
  color: string;
  checklist: ChecklistRow[];
  status: 'published' | 'draft';
}

const EMPTY = {
  name: '', cat: 'airdrop' as Cat, desc: '', deadline: '', val: '',
  elig: 'check' as Elig, color: '#5ee9a8', checklist: [] as ChecklistRow[],
};

export default function PublishAirdrops() {
  const { currentUser } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState<AirdropDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pro_airdrops'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AirdropDoc));
    });
    return () => unsub();
  }, []);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const resetForm = () => { setForm(EMPTY); setEditingId(null); };

  const addRow = () => set('checklist', [...form.checklist, { t: '', ok: false }]);
  const updateRow = (i: number, patch: Partial<ChecklistRow>) =>
    set('checklist', form.checklist.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => set('checklist', form.checklist.filter((_, idx) => idx !== i));

  const save = async (status: 'published' | 'draft') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    if (!form.name.trim() || !form.desc.trim()) { setMessage('Name and description are required.'); return; }
    setLoading(true);
    try {
      const payload = { ...form, checklist: form.checklist.filter((r) => r.t.trim()), status };
      if (editingId) {
        await updateDoc(doc(db, 'pro_airdrops', editingId), { ...payload, updatedAt: serverTimestamp() });
        setMessage('Airdrop updated.');
      } else {
        await addDoc(collection(db, 'pro_airdrops'), { ...payload, createdAt: serverTimestamp(), createdBy: currentUser.uid });
        setMessage(status === 'published' ? 'Airdrop published!' : 'Draft saved.');
      }
      resetForm();
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally { setLoading(false); }
  };

  const startEdit = (item: AirdropDoc) => {
    setEditingId(item.id);
    setForm({
      name: item.name, cat: item.cat, desc: item.desc, deadline: item.deadline,
      val: item.val, elig: item.elig, color: item.color || '#5ee9a8', checklist: item.checklist || [],
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this airdrop? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'pro_airdrops', id));
      if (editingId === id) resetForm();
      setMessage('Airdrop deleted.');
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const inputCls = 'w-full p-2 border border-gray-300 rounded-md text-black';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-end mb-2"><AdminPageTour steps={proAdminTourSteps('Airdrops & Whitelist', '/world/pro?tab=airdrops')} /></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Airdrops &amp; Whitelist</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Curated drops and whitelist access shown on the Pro dashboard, each with an eligibility checklist.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); save('published'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select className={`${inputCls} bg-white`} value={form.cat} onChange={(e) => set('cat', e.target.value as Cat)}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className={`${inputCls} h-20`} value={form.desc} onChange={(e) => set('desc', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <input className={inputCls} value={form.deadline} onChange={(e) => set('deadline', e.target.value)} placeholder="e.g. 2d 4h, or Not live" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated value</label>
          <input className={inputCls} value={form.val} onChange={(e) => set('val', e.target.value)} placeholder="e.g. $180–420 est." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility</label>
          <select className={`${inputCls} bg-white`} value={form.elig} onChange={(e) => set('elig', e.target.value as Elig)}>
            {ELIGS.map((e) => <option key={e} value={e}>{ELIG_LABEL[e]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Accent color</label>
          <input type="color" className="w-full h-10 p-1 border border-gray-300 rounded-md" value={form.color} onChange={(e) => set('color', e.target.value)} />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility checklist</label>
          <div className="space-y-2">
            {form.checklist.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={r.ok} onChange={(e) => updateRow(i, { ok: e.target.checked })} title="Met?" />
                <input className={inputCls} value={r.t} onChange={(e) => updateRow(i, { t: e.target.value })} placeholder="Checklist item" />
                <button type="button" onClick={() => removeRow(i)} className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100">Remove</button>
              </div>
            ))}
            <button type="button" onClick={addRow} className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200 text-gray-800">+ Add checklist item</button>
          </div>
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

      <h3 data-tour="admin-list" className="text-lg font-semibold text-gray-900 mb-3">Existing entries ({items.length})</h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-gray-500 text-sm">No airdrops yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
            <span className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-white" style={{ background: item.color || '#5ee9a8' }}>{item.name.charAt(0)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{item.name}</span>
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">{item.cat}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">{ELIG_LABEL[item.elig]}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.desc}</p>
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
