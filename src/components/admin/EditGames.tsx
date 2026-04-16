'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatTimestamp } from './utils';

interface GameArticle { id: string; title: string; genres: string[]; networks: string[]; platformTypes: string[]; tagline: string; summary: string; imageDetail1Url: string; portraitImageUrl: string; timestamp: { seconds: number } | null; [key: string]: unknown; }

export default function EditGames() {
  const [articles, setArticles] = useState<GameArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isUploading, setIsUploading] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!auth.currentUser) { setError('Please sign in'); setLoading(false); return; }
        const draftId = searchParams.get('id');
        if (draftId) {
          const d = await getDoc(doc(db, 'games', draftId));
          if (d.exists()) { const data = { id: d.id, ...d.data() } as GameArticle; setArticles([data]); setEditingId(data.id); setFormData(d.data()); }
          else setError('Not found');
        } else {
          const snap = await getDocs(collection(db, 'games'));
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GameArticle));
          data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
          setArticles(data);
        }
        setLoading(false);
      } catch { setError('Failed to load'); setLoading(false); }
    };
    fetch();
  }, [auth.currentUser, searchParams]);

  const handleEdit = (a: GameArticle) => { setEditingId(a.id); const { id, ...rest } = a; setFormData(rest); };
  const refresh = async () => { const snap = await getDocs(collection(db, 'games')); const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GameArticle)); data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); setArticles(data); };
  const handleUpdate = async (id: string) => { try { await updateDoc(doc(db, 'games', id), formData); setEditingId(null); await refresh(); } catch (err) { console.error(err); } };
  const handleDelete = async (id: string) => { if (!window.confirm('Delete?')) return; try { await deleteDoc(doc(db, 'games', id)); await refresh(); } catch (err) { console.error(err); } };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData((p) => ({ ...p, [e.target.name]: e.target.value })); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    try { const s = getStorage(); const r = ref(s, `game-images/${Date.now()}_${file.name}`); const snap = await uploadBytes(r, file); const url = await getDownloadURL(snap.ref); setFormData((p) => ({ ...p, [field]: url })); } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Games</h2>
      <div className="space-y-4">
        {articles.map((article) => (
          <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-4">
            {editingId === article.id ? (
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" name="title" value={String(formData.title || '')} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Tagline</label><input type="text" name="tagline" value={String(formData.tagline || '')} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Summary</label><textarea name="summary" value={String(formData.summary || '')} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-24" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Detail Content 1</label><textarea name="detailContent1" value={String(formData.detailContent1 || '')} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-32" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Detail Content 2</label><textarea name="detailContent2" value={String(formData.detailContent2 || '')} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-32" /></div>
                {typeof formData.imageDetail1Url === "string" && formData.imageDetail1Url && <div><img src={formData.imageDetail1Url} alt="Current" className="max-h-32 rounded" /></div>}
                <div><label className="block text-sm font-medium text-gray-700">Upload New Detail Image 1</label><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageDetail1Url')} disabled={isUploading} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Discord</label><input type="url" name="discordLink" value={String(formData.discordLink || '')} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Website</label><input type="url" name="websiteLink" value={String(formData.websiteLink || '')} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(article.id)} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">Delete</button>
                  <button onClick={() => handleUpdate(article.id)} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {article.imageDetail1Url && <img src={article.imageDetail1Url} alt={article.title} className="w-16 h-16 object-cover rounded" />}
                  <div><h3 className="font-semibold text-gray-900">{article.title}</h3><p className="text-xs text-gray-400">{formatTimestamp(article.timestamp as Parameters<typeof formatTimestamp>[0])}</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(article)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Edit</button>
                  <button onClick={() => handleDelete(article.id)} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
