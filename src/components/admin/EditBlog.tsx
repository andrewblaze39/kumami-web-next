'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatTimestamp } from './utils';

interface BlogArticle { id: string; title: string; author: string; content1: string; content2: string; content: string; readTime: string | number; thumbnailImageUrl: string; detailImage1Url: string; detailImage2Url: string; imageUrl: string; likes: number; summary: string; timestamp: { seconds: number } | null; [key: string]: unknown; }

export default function EditBlog() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ title: '', author: '', content1: '', content2: '', content: '', readTime: '', thumbnailImageUrl: '', detailImage1Url: '', detailImage2Url: '', imageUrl: '', likes: 0, summary: '', timestamp: null as { seconds: number } | null });
  const [isUploading, setIsUploading] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!auth.currentUser) { setError('Please sign in'); setLoading(false); return; }
        const draftId = searchParams.get('id');
        if (draftId) {
          const d = await getDoc(doc(db, 'blogs', draftId));
          if (d.exists()) { const data = { id: d.id, ...d.data() } as BlogArticle; setArticles([data]); setEditingId(data.id); setFormData({ title: data.title, author: data.author || '', content1: (data.content1 || data.content || '').replace(/\\n/g, '\n'), content2: (data.content2 || '').replace(/\\n/g, '\n'), content: (data.content1 || data.content || '').replace(/\\n/g, '\n'), readTime: String(data.readTime || ''), thumbnailImageUrl: data.thumbnailImageUrl || '', detailImage1Url: data.detailImage1Url || '', detailImage2Url: data.detailImage2Url || '', imageUrl: data.imageUrl || '', likes: data.likes || 0, summary: data.summary || '', timestamp: data.timestamp }); }
          else setError('Draft not found');
        } else {
          const snap = await getDocs(collection(db, 'blogs'));
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BlogArticle));
          data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
          setArticles(data);
        }
        setLoading(false);
      } catch { setError('Failed to load'); setLoading(false); }
    };
    fetch();
  }, [auth.currentUser, searchParams]);

  const handleEdit = (a: BlogArticle) => { setEditingId(a.id); setFormData({ title: a.title, author: a.author || '', content1: (a.content1 || a.content || '').replace(/\\n/g, '\n'), content2: (a.content2 || '').replace(/\\n/g, '\n'), content: (a.content1 || a.content || '').replace(/\\n/g, '\n'), readTime: String(a.readTime || ''), thumbnailImageUrl: a.thumbnailImageUrl || '', detailImage1Url: a.detailImage1Url || '', detailImage2Url: a.detailImage2Url || '', imageUrl: a.imageUrl || '', likes: a.likes || 0, summary: a.summary || '', timestamp: a.timestamp }); };
  const refresh = async () => { const snap = await getDocs(collection(db, 'blogs')); const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BlogArticle)); data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); setArticles(data); };
  const handleUpdate = async (id: string) => { try { await updateDoc(doc(db, 'blogs', id), { ...formData, readTime: Number(formData.readTime) || 1 }); setEditingId(null); await refresh(); } catch (err) { console.error(err); } };
  const handleDelete = async (id: string) => { if (!window.confirm('Delete?')) return; try { await deleteDoc(doc(db, 'blogs', id)); await refresh(); } catch (err) { console.error(err); } };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData((p) => ({ ...p, [e.target.name]: e.target.value })); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    try { const s = getStorage(); const r = ref(s, `blog-images/${Date.now()}_${file.name}`); const snap = await uploadBytes(r, file); const url = await getDownloadURL(snap.ref); setFormData((p) => ({ ...p, [field]: url })); } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Blog Posts</h2>
      <div className="space-y-4">
        {articles.map((article) => (
          <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-4">
            {editingId === article.id ? (
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Summary</label><textarea name="summary" value={formData.summary} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-20" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Read Time</label><input type="number" name="readTime" value={formData.readTime} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Upload Thumbnail</label><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'thumbnailImageUrl')} disabled={isUploading} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Content 1</label><textarea name="content1" value={formData.content1} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-32" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Content 2</label><textarea name="content2" value={formData.content2} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-32" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Created At</label><input type="text" value={formatTimestamp(formData.timestamp as Parameters<typeof formatTimestamp>[0])} disabled className="w-full p-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50" /></div>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(article.id)} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">Delete</button>
                  <button onClick={() => handleUpdate(article.id)} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {(article.thumbnailImageUrl || article.imageUrl) && <img src={article.thumbnailImageUrl || article.imageUrl} alt={article.title} className="w-16 h-16 object-cover rounded" />}
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
