'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatTimestamp } from './utils';

const CATEGORIES = ['Web 3 Platform','Artificial Intelligence','Blockchain','DeFi','DePIN','Games','Gaming Guild','NFT','Memes','Exchanges','RWA','Education'];

interface ResearchArticle { id: string; title: string; author: string; category: string; description: string; content1: string; content2: string; discordLink: string; imageUrl: string; detailImageUrl: string; telegramLink: string; twitterLink: string; websiteLink: string; createdAt: { seconds: number } | null; [key: string]: unknown; }

export default function EditResearch() {
  const [articles, setArticles] = useState<ResearchArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<ResearchArticle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', author: '', category: '', description: '', content1: '', content2: '', discordLink: '', imageUrl: '', detailImageUrl: '', telegramLink: '', twitterLink: '', websiteLink: '', createdAt: null as { seconds: number } | null });
  const [isUploading, setIsUploading] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!auth.currentUser) { setError('Please sign in'); setLoading(false); return; }
        const snap = await getDocs(collection(db, 'research_articles'));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ResearchArticle)).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        setArticles(data); setFilteredArticles(data); setLoading(false);
      } catch { setError('Failed to load.'); setLoading(false); }
    };
    fetch();
  }, [auth.currentUser]);

  const handleEdit = (a: ResearchArticle) => { setEditingId(a.id); setFormData({ title: a.title, author: a.author, category: a.category, description: a.description || '', content1: a.content1 || '', content2: a.content2 || '', discordLink: a.discordLink || '', imageUrl: a.imageUrl || '', detailImageUrl: a.detailImageUrl || '', telegramLink: a.telegramLink || '', twitterLink: a.twitterLink || '', websiteLink: a.websiteLink || '', createdAt: a.createdAt }); };

  const refresh = async () => { const snap = await getDocs(collection(db, 'research_articles')); const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ResearchArticle)).sort((a, b) => (a.title || '').localeCompare(b.title || '')); setArticles(data); setFilteredArticles(data); };

  const handleUpdate = async (id: string) => { try { await updateDoc(doc(db, 'research_articles', id), { ...formData }); setEditingId(null); await refresh(); } catch (err) { console.error(err); } };
  const handleDelete = async (id: string) => { if (!window.confirm('Delete?')) return; try { await deleteDoc(doc(db, 'research_articles', id)); await refresh(); } catch (err) { console.error(err); } };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setFormData((p) => ({ ...p, [e.target.name]: e.target.value })); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'detailImageUrl') => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    try { const s = getStorage(); const r = ref(s, `research-images/${Date.now()}_${file.name}`); const snap = await uploadBytes(r, file); const url = await getDownloadURL(snap.ref); setFormData((p) => ({ ...p, [field]: url })); } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Research Articles</h2>
      <input type="text" placeholder="Search articles..." value={searchTerm} onChange={(e) => { const t = e.target.value.toLowerCase(); setSearchTerm(t); setFilteredArticles(articles.filter((a) => (a.title || '').toLowerCase().includes(t) || (a.author || '').toLowerCase().includes(t) || (a.category || '').toLowerCase().includes(t))); }} className="w-full p-3 border border-gray-300 rounded-lg text-black bg-white mb-6" />
      <div className="space-y-4">
        {filteredArticles.map((article) => (
          <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-4">
            {editingId === article.id ? (
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Author</label><input type="text" name="author" value={formData.author} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Category</label><select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700">Description</label><textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-20" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Content 1</label><textarea name="content1" value={formData.content1} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-32" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Content 2</label><textarea name="content2" value={formData.content2} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-32" /></div>
                {formData.imageUrl && <div><img src={formData.imageUrl} alt="Current" className="max-h-32 rounded" /><p className="text-xs text-gray-500">Current Main Image</p></div>}
                <div><label className="block text-sm font-medium text-gray-700">Upload New Main Image</label><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageUrl')} disabled={isUploading} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" /></div>
                {formData.detailImageUrl && <div><img src={formData.detailImageUrl} alt="Detail" className="max-h-32 rounded" /><p className="text-xs text-gray-500">Current Detail Image</p></div>}
                <div><label className="block text-sm font-medium text-gray-700">Upload New Detail Image</label><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'detailImageUrl')} disabled={isUploading} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Website</label><input type="url" name="websiteLink" value={formData.websiteLink} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Twitter</label><input type="url" name="twitterLink" value={formData.twitterLink} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Telegram</label><input type="url" name="telegramLink" value={formData.telegramLink} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Discord</label><input type="url" name="discordLink" value={formData.discordLink} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Created At</label><input type="text" value={formatTimestamp(formData.createdAt as Parameters<typeof formatTimestamp>[0])} disabled className="w-full p-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50" /></div>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(article.id)} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm">Delete</button>
                  <button onClick={() => handleUpdate(article.id)} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {article.imageUrl && <img src={article.imageUrl} alt={article.title} className="w-16 h-16 object-cover rounded" />}
                  <div><h3 className="font-semibold text-gray-900">{article.title}</h3><p className="text-sm text-gray-500">{article.author}</p><p className="text-xs text-gray-400">{formatTimestamp(article.createdAt as Parameters<typeof formatTimestamp>[0])}</p></div>
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
