'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function PublishMarketAnalysis() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !image) { alert('Title and image are required!'); return; }
    setLoading(true);
    try {
      const storageRef = ref(storage, `marketAnalysisImages/${image.name}`);
      const snapshot = await uploadBytes(storageRef, image);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      await addDoc(collection(db, 'marketAnalysis'), { title, content, imageUrl: downloadUrl, createdAt: serverTimestamp() });
      setTitle(''); setContent(''); setImage(null); setPreviewUrl('');
      alert('Market analysis published successfully!');
    } catch (error) { console.error(error); alert('Error publishing.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Publish Market Analysis</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-black" required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Content</label><textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md h-32 text-black" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Image</label><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImage(f); setPreviewUrl(URL.createObjectURL(f)); }}} className="w-full text-sm text-gray-500" required />{previewUrl && <img src={previewUrl} alt="Preview" className="mt-2 max-w-xs max-h-48 rounded-md" />}</div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Publishing...' : 'Publish Market Analysis'}</button>
      </form>
    </div>
  );
}
