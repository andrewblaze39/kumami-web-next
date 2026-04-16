'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatTimestamp, generateId } from './utils';

interface ContentItem { id?: string; type: 'paragraph' | 'image' | 'youtube'; text?: string; src?: string; alt?: string; caption?: string; videoId?: string; title?: string; }
interface Section { id: string; title: string; content: ContentItem[]; }
interface Article { id: string; title: string; level: string; author: string; thumbnail: string; sections: Section[]; createdAt: { seconds: number } | null; [key: string]: unknown; }

const LEVELS = ['Level 1','Level 2','Level 3','Level 4','Level 5','Featured Classes'];

export default function EditEducation() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', level: 'Level 1', author: '', thumbnail: '', createdAt: null as { seconds: number } | null });
  const [sections, setSections] = useState<Section[]>([]);
  const auth = getAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!auth.currentUser) { setError('Please sign in'); setLoading(false); return; }
        const snap = await getDocs(collection(db, 'education_articles'));
        setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Article)));
        setLoading(false);
      } catch { setError('Failed to load'); setLoading(false); }
    };
    fetch();
  }, [auth.currentUser]);

  const handleEdit = (a: Article) => {
    setEditingId(a.id);
    setFormData({ title: a.title || '', level: a.level || 'Level 1', author: a.author || '', thumbnail: a.thumbnail || '', createdAt: a.createdAt });
    setSections(Array.isArray(a.sections) ? a.sections.map((s) => ({ id: generateId(), title: s.title || '', content: Array.isArray(s.content) ? s.content.map((i) => ({ id: generateId(), ...i })) : [] })) : []);
  };

  const refresh = async () => { const snap = await getDocs(collection(db, 'education_articles')); setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Article))); };

  const handleUpdate = async (id: string) => {
    try {
      const cleanedSections = sections.filter((s) => s.title || s.content.length > 0).map((s) => ({ title: s.title, content: s.content.map(({ type, text, src, alt, caption, videoId, title: t }) => type === 'paragraph' ? { type, text: text || '' } : type === 'image' ? { type, src: src || '', alt: alt || '', caption: caption || '' } : { type, videoId: videoId || '', title: t || '', caption: caption || '' }) }));
      await updateDoc(doc(db, 'education_articles', id), { title: formData.title, level: formData.level, author: formData.author, thumbnail: formData.thumbnail, sections: cleanedSections });
      setEditingId(null); await refresh();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => { if (!window.confirm('Delete?')) return; try { await deleteDoc(doc(db, 'education_articles', id)); await refresh(); } catch (err) { console.error(err); } };

  const addSection = () => setSections((p) => [...p, { id: generateId(), title: '', content: [] }]);
  const addItem = (sId: string) => setSections((p) => p.map((s) => s.id === sId ? { ...s, content: [...s.content, { id: generateId(), type: 'paragraph' as const, text: '' }] } : s));
  const removeItem = (sId: string, iId: string) => setSections((p) => p.map((s) => s.id === sId ? { ...s, content: s.content.filter((i) => i.id !== iId) } : s));
  const updateItem = (sId: string, iId: string, patch: Partial<ContentItem>) => setSections((p) => p.map((s) => s.id === sId ? { ...s, content: s.content.map((i) => i.id === iId ? { ...i, ...patch } : i) } : s));

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const r = ref(storage, `education-thumbnails/${Date.now()}_${file.name}`); const snap = await uploadBytes(r, file, { contentType: file.type }); const url = await getDownloadURL(snap.ref); setFormData((p) => ({ ...p, thumbnail: url })); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Education Articles</h2>
      <div className="space-y-4">
        {articles.map((article) => (
          <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-4">
            {editingId === article.id ? (
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Level</label><select value={formData.level} onChange={(e) => setFormData((p) => ({ ...p, level: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white">{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700">Author</label><input type="text" value={formData.author} onChange={(e) => setFormData((p) => ({ ...p, author: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Upload Thumbnail</label><input type="file" accept="image/*" onChange={handleThumbnailUpload} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" />{formData.thumbnail && <img src={formData.thumbnail} alt="Thumb" className="mt-2 max-h-20 rounded" />}</div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Sections</label>
                  {sections.map((section) => (
                    <div key={section.id} className="border-2 border-[#96EDD6]/80 rounded-xl p-3 bg-[#DFF7F0]">
                      <input type="text" value={section.title} onChange={(e) => setSections((p) => p.map((s) => s.id === section.id ? { ...s, title: e.target.value } : s))} className="w-full p-2 border border-gray-300 rounded-md text-black mb-2" placeholder="Section title" />
                      {section.content.map((item) => (
                        <div key={item.id} className="border border-[#96EDD6]/40 rounded-lg p-2 bg-[#F3FFFC] mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <select value={item.type} onChange={(e) => updateItem(section.id, item.id!, { type: e.target.value as ContentItem['type'], text: '', src: '', alt: '', caption: '', videoId: '', title: '' })} className="p-1 border rounded text-black text-sm bg-white"><option value="paragraph">Paragraph</option><option value="image">Image</option><option value="youtube">YouTube</option></select>
                            <button type="button" onClick={() => removeItem(section.id, item.id!)} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">Remove</button>
                          </div>
                          {item.type === 'paragraph' && <textarea value={item.text || ''} onChange={(e) => updateItem(section.id, item.id!, { text: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md text-black" rows={3} />}
                          {item.type === 'image' && <input type="text" value={item.src || ''} onChange={(e) => updateItem(section.id, item.id!, { src: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md text-black" placeholder="Image URL" />}
                          {item.type === 'youtube' && <input type="text" value={item.videoId || ''} onChange={(e) => updateItem(section.id, item.id!, { videoId: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md text-black" placeholder="Video ID" />}
                        </div>
                      ))}
                      <button type="button" onClick={() => addItem(section.id)} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">Add item</button>
                    </div>
                  ))}
                  <button type="button" onClick={addSection} className="px-3 py-2 bg-gray-900 text-white rounded-md text-sm">Add section</button>
                </div>
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
                  {article.thumbnail && <img src={article.thumbnail} alt={article.title} className="w-16 h-16 object-cover rounded" />}
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
