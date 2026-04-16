'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatSelection as fmtSel, getFormattedPreviewHtml } from './utils';

export default function PublishBlog() {
  const [title, setTitle] = useState('');
  const [content1, setContent1] = useState('');
  const [content2, setContent2] = useState('');
  const [summary, setSummary] = useState('');
  const [author, setAuthor] = useState('');
  const [readTime, setReadTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [detailImageFile, setDetailImageFile] = useState<File | null>(null);
  const [detailImagePreview, setDetailImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const { currentUser, userData } = useAuth();

  const uploadImage = (file: File): Promise<string> => {
    const storageRef = ref(storage, `blog-images/${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      task.on('state_changed', (s) => setUploadProgress((s.bytesTransferred / s.totalBytes) * 100), reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
    });
  };

  const calculateReadTime = () => Math.max(1, Math.ceil(`${content1} ${content2}`.trim().split(/\s+/).filter(Boolean).length / 200));

  const saveArticle = async (status: 'draft' | 'published') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    setLoading(true);
    try {
      let thumbUrl = ''; let detailUrl: string | null = null;
      if (thumbnailFile) thumbUrl = await uploadImage(thumbnailFile);
      else if (status === 'published') throw new Error('Please select a thumbnail image');
      if (detailImageFile) detailUrl = await uploadImage(detailImageFile);
      await addDoc(collection(db, 'blogs'), { title: title || 'Untitled Draft', content1, content2, content: content1, summary, thumbnailImageUrl: thumbUrl, detailImageUrl: detailUrl, author: author || currentUser.email, timestamp: serverTimestamp(), readTime: Number(readTime) > 0 ? Number(readTime) : calculateReadTime(), likes: 0, status });
      setMessage(status === 'published' ? 'Blog published!' : 'Draft saved!');
      setTitle(''); setContent1(''); setContent2(''); setSummary(''); setThumbnailFile(null); setThumbnailPreview(''); setDetailImageFile(null); setDetailImagePreview(''); setUploadProgress(0); setAuthor(''); setReadTime('');
    } catch (err: unknown) { setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown')); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Blog Post</h2>
      <form onSubmit={(e) => { e.preventDefault(); saveArticle('published'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Read Time (minutes)</label><input type="number" min="1" className="w-full p-2 border border-gray-300 rounded-md text-black" value={readTime} onChange={(e) => setReadTime(e.target.value)} placeholder={String(calculateReadTime())} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail Image</label><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setThumbnailFile(f); setThumbnailPreview(URL.createObjectURL(f)); }}} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" />{thumbnailPreview && <img src={thumbnailPreview} alt="Thumb" className="mt-2 max-h-32 rounded" />}{uploadProgress > 0 && uploadProgress < 100 && <div className="mt-1 text-xs text-gray-500"><progress value={uploadProgress} max="100" /> {Math.round(uploadProgress)}%</div>}</div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Detail Image (optional)</label><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setDetailImageFile(f); setDetailImagePreview(URL.createObjectURL(f)); }}} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" />{detailImagePreview && <img src={detailImagePreview} alt="Detail" className="mt-2 max-h-32 rounded" />}</div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Summary</label><input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={summary} onChange={(e) => setSummary(e.target.value)} required /></div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Section 1</label>
          <div className="flex gap-1 mb-1"><button type="button" onClick={() => fmtSel('blog-c1', content1, 'bold', setContent1)} className="px-2 py-1 bg-gray-100 text-xs rounded font-semibold">Bold</button><button type="button" onClick={() => fmtSel('blog-c1', content1, 'italic', setContent1)} className="px-2 py-1 bg-gray-100 text-xs rounded italic">Italic</button></div>
          <textarea id="blog-c1" className="w-full p-2 border border-gray-300 rounded-md text-black h-32" value={content1} onChange={(e) => setContent1(e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Section 2</label>
          <textarea className="w-full p-2 border border-gray-300 rounded-md text-black h-32" value={content2} onChange={(e) => setContent2(e.target.value)} />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button type="button" onClick={() => saveArticle('draft')} disabled={loading} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300">{loading ? 'Saving...' : 'Save as Draft'}</button>
          <button type="submit" disabled={loading || userData?.role !== 'superadmin'} className={`px-4 py-2 rounded-md font-medium ${userData?.role === 'superadmin' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>{loading ? 'Publishing...' : 'Publish Blog'}</button>
        </div>
        {message && <p className={`md:col-span-2 text-sm ${message.includes('!') && !message.includes('Error') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </form>
      <div className="mt-8 border-t pt-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Live Preview</h2>
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title || 'Untitled Blog Post'}</h3>
          {thumbnailPreview && <img src={thumbnailPreview} alt="Preview" className="mt-4 w-full max-h-64 object-cover rounded" />}
          {summary && <p className="mt-4 text-gray-700 italic">{summary}</p>}
          {content1 ? <div className="mt-4 text-gray-800 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: getFormattedPreviewHtml(content1) }} /> : <p className="mt-4 text-gray-400 text-sm">Start typing to see preview.</p>}
        </div>
      </div>
    </div>
  );
}
