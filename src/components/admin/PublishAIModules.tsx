'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from './utils';

export default function PublishAIModules() {
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('Level 1');
  const [author, setAuthor] = useState('Kumami Team');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { currentUser } = useAuth();

  const parseContentToSections = (text: string) => {
    const lines = text.split(/\r?\n/);
    const sections: { title: string; content: { type: string; text?: string; src?: string; alt?: string; caption?: string; videoId?: string; title?: string }[] }[] = [];
    let current: (typeof sections)[0] | null = null;
    const start = (t: string) => { if (current) sections.push(current); current = { title: t.trim(), content: [] }; };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('## ')) { start(line.substring(3).trim()); continue; }
      if (line.toUpperCase().startsWith('IMG:')) { const p = line.substring(4).trim().split('|').map((s) => s.trim()); if (!current) start(''); current!.content.push({ type: 'image', src: p[0], alt: p[1] || '', caption: p[2] || '' }); continue; }
      if (line.toUpperCase().startsWith('YT:')) { const p = line.substring(3).trim().split('|').map((s) => s.trim()); if (!current) start(''); current!.content.push({ type: 'youtube', videoId: p[0], title: p[1] || '', caption: p[2] || '' }); continue; }
      if (!current) start('');
      current!.content.push({ type: 'paragraph', text: raw });
    }
    if (current) sections.push(current);
    return sections;
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.match('image.*')) { alert('Select an image'); return; }
    setThumbnailFile(file);
    const reader = new FileReader(); reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string); reader.readAsDataURL(file);
  };

  const saveModule = async (status: 'draft' | 'published') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    setLoading(true); setMessage('');
    try {
      let thumbnailUrl = '';
      if (thumbnailFile) { const r = ref(storage, `ai-module-thumbnails/${generateId()}`); const snap = await uploadBytes(r, thumbnailFile, { contentType: thumbnailFile.type }); thumbnailUrl = await getDownloadURL(snap.ref); }
      const sections = rawContent.trim() ? parseContentToSections(rawContent) : [];
      await addDoc(collection(db, 'ai_modules'), { title: title || (status === 'draft' ? 'Untitled Draft' : ''), level, author: author || currentUser.email, thumbnail: thumbnailUrl, sections, status, createdAt: serverTimestamp() });
      setMessage(status === 'draft' ? 'Draft saved!' : 'Published!');
      setTitle(''); setLevel('Level 1'); setAuthor('Kumami Team'); setThumbnailFile(null); setThumbnailPreview(''); setRawContent('');
    } catch (err: unknown) { setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown')); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Publish AI Module</h1>
      {message && <div className="mb-4 p-3 rounded-md text-center bg-gray-100 text-gray-800">{message}</div>}
      <form className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Level</label><select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"><option value="Level 1">Level 1</option><option value="Level 2">Level 2</option><option value="Level 3">Level 3</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Author</label><input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-black" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label><input type="file" accept="image/*" onChange={handleThumbnailChange} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" />{thumbnailPreview && <img src={thumbnailPreview} alt="Thumb" className="mt-2 w-32 h-20 object-cover rounded" />}</div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Content</label><textarea value={rawContent} onChange={(e) => setRawContent(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md h-64 text-black font-mono text-xs" placeholder="Use ## for sections, IMG: for images, YT: for videos" /></div>
        <div className="flex gap-2">
          <button type="button" disabled={loading} onClick={() => saveModule('draft')} className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400">{loading ? 'Saving...' : 'Save Draft'}</button>
          <button type="button" disabled={loading} onClick={() => { if (!title || !rawContent.trim()) { alert('Title and content required'); return; } saveModule('published'); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Publishing...' : 'Publish'}</button>
        </div>
      </form>
    </div>
  );
}
