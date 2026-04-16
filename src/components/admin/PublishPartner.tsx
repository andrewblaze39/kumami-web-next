'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { generateId } from './utils';

const CATEGORIES = ['Web 3 Platform','Artificial Intelligence','Blockchain','DeFi','DePIN','Games','Gaming Guild','NFT','Memes','Exchanges','RWA','Education'];

export default function PublishPartner() {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');const [author, setAuthor] = useState('');const [category, setCategory] = useState('Web 3 Platform');const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);const [imagePreview, setImagePreview] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');const [twitterLink, setTwitterLink] = useState('');const [telegramLink, setTelegramLink] = useState('');const [discordLink, setDiscordLink] = useState('');
  const [loading, setLoading] = useState(false);const [message, setMessage] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.match('image.*') || file.size > 10 * 1024 * 1024) { setMessage('Invalid image'); return; }
    setImageFile(file); const reader = new FileReader(); reader.onload = (ev) => setImagePreview(ev.target?.result as string); reader.readAsDataURL(file);
  };

  const saveContent = async (status: 'published' | 'draft') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    setLoading(true);
    try {
      if (!imageFile) throw new Error('Please select an image');
      const r = ref(storage, `partner-images/${generateId()}`); const snap = await uploadBytes(r, imageFile, { contentType: imageFile.type }); const imageUrl = await getDownloadURL(snap.ref);
      await addDoc(collection(db, 'partner_articles'), { title, author: author || currentUser.email, category, description, imageUrl, websiteLink, twitterLink, telegramLink, discordLink, createdAt: serverTimestamp(), createdBy: currentUser.uid, status });
      setMessage(status === 'published' ? 'Published!' : 'Draft saved!');
      setTitle('');setAuthor('');setCategory('Web 3 Platform');setDescription('');setImageFile(null);setImagePreview('');setWebsiteLink('');setTwitterLink('');setTelegramLink('');setDiscordLink('');
    } catch (err: unknown) { setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown')); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Publish Partner</h2>
      <form onSubmit={(e) => { e.preventDefault(); saveContent('published'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Author</label><input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Partner Image</label><input type="file" accept="image/*" onChange={handleImageChange} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" required />{imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 max-h-32 rounded" />}</div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="w-full p-2 border border-gray-300 rounded-md text-black h-24" value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={websiteLink} onChange={(e) => setWebsiteLink(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={twitterLink} onChange={(e) => setTwitterLink(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Telegram</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Discord</label><input type="url" className="w-full p-2 border border-gray-300 rounded-md text-black" value={discordLink} onChange={(e) => setDiscordLink(e.target.value)} /></div>
        <div className="md:col-span-2 flex gap-3">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Publishing...' : 'Publish'}</button>
          <button type="button" onClick={() => saveContent('draft')} disabled={loading} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300">{loading ? 'Saving...' : 'Save as Draft'}</button>
        </div>
        {message && <p className={`md:col-span-2 text-sm ${message.includes('!') && !message.includes('Error') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </form>
    </div>
  );
}
