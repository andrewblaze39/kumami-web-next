'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateId } from './utils';

interface ContentItem { id: string; type: 'paragraph' | 'image' | 'youtube'; text?: string; src?: string; alt?: string; caption?: string; videoId?: string; title?: string; }
interface Section { id: string; title: string; content: ContentItem[]; }

export default function PublishEducation() {
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('Level 1');
  const [author, setAuthor] = useState('Kumami Team');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [sections, setSections] = useState<Section[]>([{ id: generateId(), title: '', content: [{ id: generateId(), type: 'paragraph', text: '' }] }]);
  const [loading, setLoading] = useState(false);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.match('image.*')) { alert('Please select an image'); return; }
    setThumbnailFile(file);
    const reader = new FileReader(); reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string); reader.readAsDataURL(file);
  };

  const addSection = () => setSections((p) => [...p, { id: generateId(), title: '', content: [] }]);
  const removeSection = (id: string) => setSections((p) => p.filter((s) => s.id !== id));
  const updateSectionTitle = (id: string, v: string) => setSections((p) => p.map((s) => s.id === id ? { ...s, title: v } : s));
  const addItem = (sId: string) => setSections((p) => p.map((s) => s.id === sId ? { ...s, content: [...s.content, { id: generateId(), type: 'paragraph', text: '' }] } : s));
  const removeItem = (sId: string, iId: string) => setSections((p) => p.map((s) => s.id === sId ? { ...s, content: s.content.filter((i) => i.id !== iId) } : s));
  const updateItem = (sId: string, iId: string, patch: Partial<ContentItem>) => setSections((p) => p.map((s) => s.id === sId ? { ...s, content: s.content.map((i) => i.id === iId ? { ...i, ...patch } : i) } : s));
  const changeItemType = (sId: string, iId: string, type: ContentItem['type']) => {
    if (type === 'paragraph') updateItem(sId, iId, { type: 'paragraph', text: '' });
    else if (type === 'image') updateItem(sId, iId, { type: 'image', src: '', alt: '', caption: '' });
    else if (type === 'youtube') updateItem(sId, iId, { type: 'youtube', videoId: '', title: '', caption: '' });
  };

  const saveArticle = async (status: 'draft' | 'published') => {
    if (!title) { alert('Title required'); return; }
    setLoading(true);
    try {
      let thumbnailUrl = '';
      if (thumbnailFile) { const r = ref(storage, `education-thumbnails/${generateId()}`); const snap = await uploadBytes(r, thumbnailFile, { contentType: thumbnailFile.type }); thumbnailUrl = await getDownloadURL(snap.ref); }
      const cleanedSections = sections.filter((s) => s.title || s.content.length > 0).map((s) => ({ title: s.title, content: s.content.map(({ type, text, src, alt, caption, videoId, title: t }) => type === 'paragraph' ? { type, text } : type === 'image' ? { type, src, alt, caption } : { type, videoId, title: t, caption }) }));
      await addDoc(collection(db, 'education_articles'), { title, level, author, thumbnail: thumbnailUrl, sections: cleanedSections, status, createdAt: serverTimestamp() });
      alert(status === 'draft' ? 'Draft saved!' : 'Published!');
      setTitle(''); setLevel('Level 1'); setAuthor('Kumami Team'); setThumbnailFile(null); setThumbnailPreview('');
      setSections([{ id: generateId(), title: '', content: [{ id: generateId(), type: 'paragraph', text: '' }] }]);
    } catch (err) { console.error(err); alert('Error saving'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Publish Education Article</h1>
      <form onSubmit={(e) => { e.preventDefault(); saveArticle('published'); }} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-black" required /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Level</label><select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white">{['Level 1','Level 2','Level 3','Level 4','Level 5','Featured Classes'].map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Author</label><input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label><input type="file" accept="image/*" onChange={handleThumbnailChange} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" />{thumbnailPreview && <img src={thumbnailPreview} alt="Thumb" className="mt-2 w-32 h-20 object-cover rounded" />}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Sections</label>
          <div className="space-y-4">
            {sections.map((section, si) => (
              <div key={section.id} className="border-2 border-[#96EDD6]/80 rounded-xl p-4 bg-[#DFF7F0]">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <input type="text" value={section.title} onChange={(e) => updateSectionTitle(section.id, e.target.value)} className="flex-1 p-2 border border-gray-300 rounded-md text-black" placeholder="Section title" />
                  <button type="button" onClick={() => removeSection(section.id)} disabled={sections.length === 1} className="px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 text-sm">Remove</button>
                </div>
                <div className="space-y-3">
                  {section.content.map((item) => (
                    <div key={item.id} className="border border-[#96EDD6]/40 rounded-lg p-3 bg-[#F3FFFC]">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <select value={item.type} onChange={(e) => changeItemType(section.id, item.id, e.target.value as ContentItem['type'])} className="p-2 border border-gray-300 rounded-md text-black bg-white text-sm"><option value="paragraph">Paragraph</option><option value="image">Image</option><option value="youtube">YouTube</option></select>
                        <button type="button" onClick={() => removeItem(section.id, item.id)} className="px-2 py-1 bg-red-50 text-red-700 rounded text-sm">Remove</button>
                      </div>
                      {item.type === 'paragraph' && <textarea value={item.text || ''} onChange={(e) => updateItem(section.id, item.id, { text: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md text-black" rows={3} placeholder="Paragraph text..." />}
                      {item.type === 'image' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-2"><input type="text" value={item.src || ''} onChange={(e) => updateItem(section.id, item.id, { src: e.target.value })} className="md:col-span-2 p-2 border border-gray-300 rounded-md text-black" placeholder="Image URL" /><input type="text" value={item.alt || ''} onChange={(e) => updateItem(section.id, item.id, { alt: e.target.value })} className="p-2 border border-gray-300 rounded-md text-black" placeholder="Alt text" /><input type="text" value={item.caption || ''} onChange={(e) => updateItem(section.id, item.id, { caption: e.target.value })} className="p-2 border border-gray-300 rounded-md text-black" placeholder="Caption" /></div>)}
                      {item.type === 'youtube' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-2"><input type="text" value={item.videoId || ''} onChange={(e) => updateItem(section.id, item.id, { videoId: e.target.value })} className="p-2 border border-gray-300 rounded-md text-black" placeholder="Video ID" /><input type="text" value={item.title || ''} onChange={(e) => updateItem(section.id, item.id, { title: e.target.value })} className="p-2 border border-gray-300 rounded-md text-black" placeholder="Title" /></div>)}
                    </div>
                  ))}
                  <button type="button" onClick={() => addItem(section.id)} className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm">Add item</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addSection} className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black text-sm">Add section</button>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={loading} onClick={() => saveArticle('draft')} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300">{loading ? 'Saving...' : 'Save Draft'}</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Publishing...' : 'Publish'}</button>
        </div>
      </form>
    </div>
  );
}
