'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from './utils';

const CATEGORIES = ['Web 3 Platform','Artificial Intelligence','Blockchain','DeFi','DePIN','Games','Gaming Guild','NFT','Memes','Exchanges','RWA','Education'];

export default function PublishResearch() {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Web 3 Platform');
  const [description, setDescription] = useState('');
  const [content1, setContent1] = useState('');
  const [content2, setContent2] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [detailImageFile, setDetailImageFile] = useState<File | null>(null);
  const [detailImagePreview, setDetailImagePreview] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [twitterLink, setTwitterLink] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void, setPreview: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match('image.*')) { setMessage('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { setMessage('Image must be smaller than 10MB'); return; }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File) => {
    const storageRef = ref(storage, `research-images/${generateId()}`);
    const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
    return await getDownloadURL(snapshot.ref);
  };

  const saveContent = async (status: 'published' | 'draft') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    setLoading(true);
    try {
      if (!imageFile) throw new Error('Please select an image');
      const imageUrl = await uploadImage(imageFile);
      let detailImageUrl: string | null = null;
      if (detailImageFile) detailImageUrl = await uploadImage(detailImageFile);
      await addDoc(collection(db, 'research_articles'), {
        title, author: author || currentUser.email, category, description, content1, content2,
        imageUrl, detailImageUrl, websiteLink, twitterLink, telegramLink, discordLink,
        createdAt: serverTimestamp(), createdBy: currentUser.uid, status,
      });
      setMessage(status === 'published' ? 'Research published successfully!' : 'Research draft saved!');
      setTitle(''); setAuthor(''); setCategory('Web 3 Platform'); setDescription('');
      setContent1(''); setContent2(''); setImageFile(null); setImagePreview('');
      setDetailImageFile(null); setDetailImagePreview('');
      setWebsiteLink(''); setTwitterLink(''); setTelegramLink(''); setDiscordLink('');
    } catch (err: unknown) { setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error')); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Publish Research</h2>
      <form onSubmit={(e) => { e.preventDefault(); saveContent('published'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Author</label><input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" value={category} onChange={(e) => setCategory(e.target.value)} required>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Research Image (Main)</label>
          <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setImageFile, setImagePreview)} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" required />
          {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 max-h-32 rounded" />}
        </div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label><textarea className="w-full p-2 border border-gray-300 rounded-md text-black h-20" value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Content Section 1</label><textarea className="w-full p-2 border border-gray-300 rounded-md text-black h-32" value={content1} onChange={(e) => setContent1(e.target.value)} required /></div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Detail Image 2 (Optional)</label>
          <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, setDetailImageFile, setDetailImagePreview)} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" />
          {detailImagePreview && <img src={detailImagePreview} alt="Detail preview" className="mt-2 max-h-32 rounded" />}
        </div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Content Section 2</label><textarea className="w-full p-2 border border-gray-300 rounded-md text-black h-32" value={content2} onChange={(e) => setContent2(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Website Link (Optional)</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={websiteLink} onChange={(e) => setWebsiteLink(e.target.value)} placeholder="Leave empty to hide" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Twitter Link (Optional)</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={twitterLink} onChange={(e) => setTwitterLink(e.target.value)} placeholder="Leave empty to hide" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Telegram Link (Optional)</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} placeholder="Leave empty to hide" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Discord Link (Optional)</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={discordLink} onChange={(e) => setDiscordLink(e.target.value)} placeholder="Leave empty to hide" /></div>
        <div className="md:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Publishing...' : 'Publish Research'}</button>
          <button type="button" onClick={() => saveContent('draft')} disabled={loading} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 disabled:opacity-50">{loading ? 'Saving...' : 'Save as Draft'}</button>
        </div>
        {message && <p className={`md:col-span-2 text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </form>
    </div>
  );
}
