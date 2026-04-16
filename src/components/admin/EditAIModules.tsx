'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatTimestamp } from './utils';

interface AIModule { id: string; title: string; level: string; author: string; thumbnail: string; sections: unknown[]; status: string; createdAt: { seconds: number } | null; [key: string]: unknown; }

export default function EditAIModules() {
  const [modules, setModules] = useState<AIModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ title: '', level: 'Level 1', author: '', thumbnail: '', sectionsJson: '', status: 'draft', createdAt: null as { seconds: number } | null });
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!auth.currentUser) { setError('Please sign in'); setLoading(false); return; }
        const draftId = searchParams.get('id');
        if (draftId) {
          const d = await getDoc(doc(db, 'ai_modules', draftId));
          if (d.exists()) { const data = { id: d.id, ...d.data() } as AIModule; setModules([data]); setEditingId(data.id); setFormData({ title: data.title || '', level: data.level || 'Level 1', author: data.author || '', thumbnail: data.thumbnail || '', sectionsJson: JSON.stringify(data.sections || [], null, 2), status: data.status || 'draft', createdAt: data.createdAt }); }
          else setError('Not found');
        } else {
          const snap = await getDocs(collection(db, 'ai_modules'));
          setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AIModule)));
        }
        setLoading(false);
      } catch { setError('Failed to load'); setLoading(false); }
    };
    fetch();
  }, [auth.currentUser, searchParams]);

  const handleEdit = (m: AIModule) => { setEditingId(m.id); setFormData({ title: m.title || '', level: m.level || 'Level 1', author: m.author || '', thumbnail: m.thumbnail || '', sectionsJson: JSON.stringify(m.sections || [], null, 2), status: m.status || 'draft', createdAt: m.createdAt }); };
  const refresh = async () => { const snap = await getDocs(collection(db, 'ai_modules')); setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AIModule))); };
  const handleUpdate = async (id: string) => { try { const sections = JSON.parse(formData.sectionsJson); await updateDoc(doc(db, 'ai_modules', id), { title: formData.title, level: formData.level, author: formData.author, thumbnail: formData.thumbnail, sections, status: formData.status }); setEditingId(null); await refresh(); } catch (err) { console.error(err); alert('Error: check JSON'); } };
  const handleDelete = async (id: string) => { if (!window.confirm('Delete?')) return; try { await deleteDoc(doc(db, 'ai_modules', id)); await refresh(); } catch (err) { console.error(err); } };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setThumbnailUploading(true);
    try { const r = ref(storage, `ai-module-thumbnails/${Date.now()}_${file.name}`); const snap = await uploadBytes(r, file, { contentType: file.type }); const url = await getDownloadURL(snap.ref); setFormData((p) => ({ ...p, thumbnail: url })); } catch (err) { console.error(err); }
    finally { setThumbnailUploading(false); }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit AI Modules</h2>
      <div className="space-y-4">
        {modules.map((m) => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4">
            {editingId === m.id ? (
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Level</label><select value={formData.level} onChange={(e) => setFormData((p) => ({ ...p, level: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"><option value="Level 1">Level 1</option><option value="Level 2">Level 2</option><option value="Level 3">Level 3</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700">Author</label><input type="text" value={formData.author} onChange={(e) => setFormData((p) => ({ ...p, author: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Status</label><select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"><option value="draft">Draft</option><option value="published">Published</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700">Upload Thumbnail</label><input type="file" accept="image/*" onChange={handleThumbnailUpload} disabled={thumbnailUploading} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" />{formData.thumbnail && <img src={formData.thumbnail} alt="Thumb" className="mt-2 max-h-20 rounded" />}</div>
                <div><label className="block text-sm font-medium text-gray-700">Sections (JSON)</label><textarea value={formData.sectionsJson} onChange={(e) => setFormData((p) => ({ ...p, sectionsJson: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md text-black h-48 font-mono text-xs" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Created At</label><input type="text" value={formatTimestamp(formData.createdAt as Parameters<typeof formatTimestamp>[0])} disabled className="w-full p-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50" /></div>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(m.id)} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">Delete</button>
                  <button onClick={() => handleUpdate(m.id)} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {m.thumbnail && <img src={m.thumbnail} alt={m.title} className="w-16 h-16 object-cover rounded" />}
                  <div><h3 className="font-semibold text-gray-900">{m.title}</h3><p className="text-sm text-gray-500">{m.level} - {m.status}</p><p className="text-xs text-gray-400">{formatTimestamp(m.createdAt as Parameters<typeof formatTimestamp>[0])}</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(m)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Edit</button>
                  <button onClick={() => handleDelete(m.id)} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
