'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { formatTimestamp } from './utils';
import { applyNewsOverlay } from './applyNewsOverlay';

interface NewsArticle {
  id: string;
  title: string;
  author: string;
  category: string;
  content: string;
  imageUrl: string;
  isPremium: boolean;
  likes: number;
  readTime: number;
  summary: string;
  tags: string[];
  timestamp: { seconds: number } | null;
  [key: string]: unknown;
}

const CATEGORIES = ['Tech', 'News', 'Market', 'Games', 'Wallet', 'Funding', 'Crypto', 'Memes', 'NFT'];

export default function EditNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    title: '', author: '', category: '', content: '', imageUrl: '',
    isPremium: false, likes: 0, readTime: 0, summary: '', tags: [] as string[],
    timestamp: null as { seconds: number } | null,
    kumamiInsight: '',
  });
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [overlayApplied, setOverlayApplied] = useState(false);
  const [applyingOverlay, setApplyingOverlay] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const auth = getAuth();

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        if (!auth.currentUser) { setError('Please sign in to edit news'); setLoading(false); return; }
        const draftId = searchParams.get('id');
        if (draftId) {
          const draftDoc = await getDoc(doc(db, 'news', draftId));
          if (draftDoc.exists()) {
            const d = { id: draftDoc.id, ...draftDoc.data() } as NewsArticle;
            setArticles([d]);
            setEditingId(d.id);
            setFormData({ title: d.title, author: d.author, category: d.category, content: d.content, imageUrl: d.imageUrl, isPremium: d.isPremium, likes: d.likes || 0, readTime: d.readTime || 0, summary: d.summary || '', tags: d.tags || [], timestamp: d.timestamp, kumamiInsight: (d.kumamiInsight as string) || '' });
          } else setError('Draft not found');
        } else {
          const snap = await getDocs(collection(db, 'news'));
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsArticle));
          data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
          setArticles(data);
        }
        setLoading(false);
      } catch { setError('Failed to load news.'); setLoading(false); }
    };
    fetchArticles();
  }, [auth.currentUser, searchParams]);

  const handleEdit = (article: NewsArticle) => {
    setEditingId(article.id);
    setFormData({ title: article.title, author: article.author, category: article.category, content: article.content, imageUrl: article.imageUrl, isPremium: article.isPremium, likes: article.likes || 0, readTime: article.readTime || 0, summary: article.summary || '', tags: article.tags || [], timestamp: article.timestamp, kumamiInsight: (article.kumamiInsight as string) || '' });
  };

  const refreshArticles = async () => {
    const snap = await getDocs(collection(db, 'news'));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsArticle));
    data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    setArticles(data);
  };

  const handleUpdate = async (id: string) => {
    try { await updateDoc(doc(db, 'news', id), { ...formData }); setEditingId(null); await refreshArticles(); } catch (err) { console.error('Error updating:', err); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this news article?')) return;
    try { await deleteDoc(doc(db, 'news', id)); await refreshArticles(); } catch (err) { console.error('Error deleting:', err); setError('Failed to delete'); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value } = target;
    const checked = 'checked' in target ? target.checked : false;
    const type = 'type' in target ? target.type : 'text';
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleTagAdd = () => { if (newTag && !formData.tags.includes(newTag)) { setFormData((p) => ({ ...p, tags: [...p.tags, newTag] })); setNewTag(''); } };
  const handleTagRemove = (tag: string) => setFormData((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImageFile(file);
    setOverlayApplied(false);
  };

  const handleApplyOverlay = async () => {
    if (!pendingImageFile) return;
    setApplyingOverlay(true);
    try {
      const processed = await applyNewsOverlay(pendingImageFile);
      setPendingImageFile(processed);
      setOverlayApplied(true);
    } catch (err) {
      console.error('Overlay failed:', err);
    } finally {
      setApplyingOverlay(false);
    }
  };

  const handleUploadToStorage = async () => {
    if (!pendingImageFile) return;
    setIsUploading(true);
    try {
      const s = getStorage();
      const storageRef = ref(s, `news-images/${Date.now()}_${pendingImageFile.name}`);
      const snap = await uploadBytes(storageRef, pendingImageFile);
      const url = await getDownloadURL(snap.ref);
      setFormData((p) => ({ ...p, imageUrl: url }));
      setPendingImageFile(null);
      setOverlayApplied(false);
    } catch (err) { console.error('Error uploading:', err); }
    finally { setIsUploading(false); }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading news...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (articles.length === 0) return <div className="p-6 text-gray-500">No news articles found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit News Articles</h2>
      <div className="space-y-4">
        {articles.map((article) => (
          <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-4">
            {editingId === article.id ? (
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Author</label><input type="text" name="author" value={formData.author} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Category</label><select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"><option value="">Select</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700">Summary</label><textarea name="summary" value={formData.summary} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-20" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kumami Insight <span className="text-gray-400 font-normal">(optional — shown as a highlighted box on the article)</span></label>
                  <textarea name="kumamiInsight" value={formData.kumamiInsight} onChange={handleChange} placeholder="e.g. This signals growing institutional confidence in Layer 2 scaling solutions..." className="w-full p-2 border border-[#96EDD6] rounded-md text-black h-24 focus:outline-none focus:ring-2 focus:ring-[#96EDD6]/50" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700">Content</label><textarea name="content" value={formData.content} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black h-32" /></div>
                {formData.imageUrl && <div><img src={formData.imageUrl} alt="Current" className="max-h-32 rounded" /><p className="text-xs text-gray-500 mt-1">Current Image</p></div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Upload New Image</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" />
                  {pendingImageFile && (
                    <div className="mt-2 space-y-2">
                      <img src={URL.createObjectURL(pendingImageFile)} alt="Preview" className="max-h-32 rounded" />
                      <div className="flex items-center gap-2 flex-wrap">
                        {!overlayApplied ? (
                          <button
                            type="button"
                            onClick={handleApplyOverlay}
                            disabled={applyingOverlay}
                            className="px-3 py-1.5 bg-[#102425] text-[#96EDD6] border border-[#96EDD6]/40 rounded-md text-xs font-semibold hover:bg-[#163332] disabled:opacity-50 transition-colors"
                          >
                            {applyingOverlay ? 'Applying...' : '✦ Apply News Template'}
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-green-600">✓ Template applied (1440×960 WebP)</span>
                        )}
                        <button
                          type="button"
                          onClick={handleUploadToStorage}
                          disabled={isUploading}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {isUploading ? 'Uploading...' : 'Upload Image'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2"><input type="checkbox" name="isPremium" checked={formData.isPremium} onChange={handleChange} /><span className="text-sm text-gray-700">Premium Article</span></div>
                <div><label className="block text-sm font-medium text-gray-700">Read Time (minutes)</label><input type="number" name="readTime" value={formData.readTime} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags</label>
                  <div className="flex flex-wrap gap-1 mb-2">{formData.tags.map((tag) => <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{tag}<button type="button" onClick={() => handleTagRemove(tag)} className="ml-1 text-blue-600 hover:text-blue-900">&times;</button></span>)}</div>
                  <div className="flex gap-2"><input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag" className="flex-1 p-2 border border-gray-300 rounded-md text-black" /><button type="button" onClick={handleTagAdd} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Add</button></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700">Created At</label><input type="text" value={formatTimestamp(formData.timestamp as Parameters<typeof formatTimestamp>[0])} disabled className="w-full p-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50" /></div>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(article.id)} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">Delete</button>
                  <button onClick={() => handleUpdate(article.id)} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Save Changes</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {article.imageUrl && <img src={article.imageUrl} alt={article.title} className="w-16 h-16 object-cover rounded" />}
                  <div>
                    <h3 className="font-semibold text-gray-900">{article.title}</h3>
                    <p className="text-sm text-gray-500">{article.author}</p>
                    <p className="text-xs text-gray-400">Published: {formatTimestamp(article.timestamp as Parameters<typeof formatTimestamp>[0])}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(article)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Edit</button>
                  <button onClick={() => handleDelete(article.id)} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
