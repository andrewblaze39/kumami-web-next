'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

interface Short { id: string; title: string; videoId: string; order: number; isActive: boolean; }

export default function ManageShorts() {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', videoId: '', order: 0, isActive: true });
  const [previewVideoId, setPreviewVideoId] = useState('');
  const auth = getAuth();

  const extractVideoId = (url: string) => {
    const patterns = [/(?:youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/, /^([a-zA-Z0-9_-]{11})$/];
    for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
    return url;
  };

  useEffect(() => {
    const fetch = async () => { try { if (!auth.currentUser) { setError('Please sign in'); setLoading(false); return; } const snap = await getDocs(collection(db, 'youtube_shorts')); setShorts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Short)).sort((a, b) => (a.order || 0) - (b.order || 0))); setLoading(false); } catch { setError('Failed to load'); setLoading(false); } };
    fetch();
  }, [auth.currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'videoId') setPreviewVideoId(extractVideoId(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(formData.videoId);
    if (!videoId || videoId.length !== 11) { alert('Invalid video ID'); return; }
    if (!formData.title.trim()) { alert('Title required'); return; }
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'youtube_shorts', editingId), { title: formData.title, videoId, order: Number(formData.order) || 0, isActive: formData.isActive, updatedAt: serverTimestamp() });
        setShorts((p) => p.map((s) => s.id === editingId ? { ...s, title: formData.title, videoId, order: Number(formData.order), isActive: formData.isActive } : s).sort((a, b) => a.order - b.order));
        setEditingId(null);
      } else {
        const docRef = await addDoc(collection(db, 'youtube_shorts'), { title: formData.title, videoId, order: Number(formData.order) || 0, isActive: formData.isActive, createdAt: serverTimestamp() });
        setShorts((p) => [...p, { id: docRef.id, title: formData.title, videoId, order: Number(formData.order), isActive: formData.isActive }].sort((a, b) => a.order - b.order));
      }
      setFormData({ title: '', videoId: '', order: 0, isActive: true }); setPreviewVideoId('');
      alert(editingId ? 'Updated!' : 'Added!');
    } catch (err) { console.error(err); alert('Error saving'); }
    finally { setLoading(false); }
  };

  const handleEdit = (s: Short) => { setEditingId(s.id); setFormData({ title: s.title || '', videoId: s.videoId || '', order: s.order || 0, isActive: s.isActive !== false }); setPreviewVideoId(s.videoId || ''); };
  const handleDelete = async (id: string) => { if (!window.confirm('Delete?')) return; try { await deleteDoc(doc(db, 'youtube_shorts', id)); setShorts((p) => p.filter((s) => s.id !== id)); } catch (err) { console.error(err); } };

  if (loading && shorts.length === 0) return <div className="p-6 text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage YouTube Shorts</h2>
      <p className="text-gray-600 mb-6 text-sm">Add, edit, or remove YouTube Shorts that appear in the News Portal.</p>
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-8 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">{editingId ? 'Edit Short' : 'Add New Short'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">YouTube URL or Video ID</label><input type="text" name="videoId" value={formData.videoId} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" required /><p className="text-xs text-gray-500 mt-1">Paste YouTube Shorts URL or video ID</p></div>
          <div><label className="block text-sm font-medium text-gray-700">Display Order</label><input type="number" name="order" value={formData.order} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" min="0" /></div>
          <div className="flex items-center pt-6"><label className="flex items-center gap-2"><input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} /><span className="text-sm text-gray-700">Active (show in News Portal)</span></label></div>
        </div>
        {previewVideoId && <div><label className="block text-sm font-medium text-gray-700 mb-1">Preview</label><div className="aspect-video max-w-md"><iframe src={`https://www.youtube.com/embed/${previewVideoId}?rel=0`} title="Preview" className="w-full h-full rounded" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></div>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">{loading ? 'Saving...' : (editingId ? 'Update' : 'Add Short')}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({ title: '', videoId: '', order: 0, isActive: true }); setPreviewVideoId(''); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm">Cancel</button>}
        </div>
      </form>
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Shorts ({shorts.length})</h3>
        {shorts.length === 0 ? <p className="text-sm text-gray-500">No shorts yet.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shorts.map((s) => (
              <div key={s.id} className={`border rounded-lg overflow-hidden ${!s.isActive ? 'opacity-50' : ''}`}>
                <div className="aspect-video"><iframe src={`https://www.youtube.com/embed/${s.videoId}?rel=0`} title={s.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
                <div className="p-3"><h4 className="font-medium text-gray-900 text-sm">{s.title}</h4><p className="text-xs text-gray-500">Order: {s.order} | {s.isActive ? 'Active' : 'Inactive'}</p>
                  <div className="flex gap-2 mt-2"><button onClick={() => handleEdit(s)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Edit</button><button onClick={() => handleDelete(s.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Delete</button></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
