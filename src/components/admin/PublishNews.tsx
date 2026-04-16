'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatSelection as fmtSel, getFormattedPreviewHtml } from './utils';

const CATEGORIES = ['Tech', 'News', 'Market', 'Games', 'Wallet', 'Funding', 'Crypto', 'Memes', 'NFT'];

export default function PublishNews() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('Tech');
  const [isPremium, setIsPremium] = useState(false);
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const { currentUser, userData } = useAuth();
  const isNewsDrafter = userData?.role === 'newsdrafter';
  const isSuperAdmin = userData?.role === 'superadmin';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = (file: File): Promise<string> => {
    const storageRef = ref(storage, `news-images/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        reject,
        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
      );
    });
  };

  const resetForm = () => {
    setTitle(''); setContent(''); setSummary(''); setCategory('Tech');
    setImageFile(null); setImagePreview(''); setUploadProgress(0);
    setIsPremium(false); setAuthor(''); setTags('');
  };

  const saveArticle = async (status: 'draft' | 'published') => {
    if (!currentUser) { setMessage('Please sign in'); return; }
    if (status === 'published' && isNewsDrafter) {
      setMessage('You do not have permission to publish. Please use Save as Draft.');
      return;
    }
    setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) imageUrl = await uploadImage(imageFile);
      else if (status === 'published') throw new Error('Please select an image');

      await addDoc(collection(db, 'news'), {
        title: title || 'Untitled Draft',
        content,
        summary,
        category,
        imageUrl,
        author: author || currentUser.email,
        timestamp: serverTimestamp(),
        readTime: Math.ceil(content.split(' ').length / 200),
        likes: 0,
        isPremium,
        tags: tags.split(',').map((t) => t.trim()),
        status,
      });
      setMessage(status === 'published' ? 'News published successfully!' : 'Draft saved successfully!');
      resetForm();
    } catch (err: unknown) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Article</h2>
      <form onSubmit={(e) => { e.preventDefault(); saveArticle('published'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Author Name</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Defaults to your email if empty" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
          <span className="text-sm text-gray-700">Premium Article</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">News Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} className="w-full p-2 border border-gray-300 rounded-md text-black bg-white" />
          {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 max-h-40 rounded" />}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <progress value={uploadProgress} max="100" /> <span>{Math.round(uploadProgress)}%</span>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tech, news, kumami" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded-md text-black" value={summary} onChange={(e) => setSummary(e.target.value)} required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <div className="flex gap-1 mb-2">
            <button type="button" onClick={() => fmtSel('news-content', content, 'bold', setContent)} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold hover:bg-gray-200">Bold</button>
            <button type="button" onClick={() => fmtSel('news-content', content, 'italic', setContent)} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs italic hover:bg-gray-200">Italic</button>
            <button type="button" onClick={() => fmtSel('news-content', content, 'underline', setContent)} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs underline hover:bg-gray-200">Underline</button>
          </div>
          <textarea id="news-content" className="w-full p-2 border border-gray-300 rounded-md text-black h-48" value={content} onChange={(e) => setContent(e.target.value)} required />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button type="button" onClick={() => saveArticle('draft')} disabled={loading} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>
          <button type="submit" disabled={loading || !isSuperAdmin} className={`px-4 py-2 rounded-md font-medium transition ${isSuperAdmin ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            {loading ? 'Publishing...' : 'Publish Article'}
          </button>
        </div>
        {message && <p className={`md:col-span-2 text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </form>

      {/* Live Preview */}
      <div className="mt-8 border-t pt-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Live Preview</h2>
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title || 'Untitled Article'}</h3>
          <div className="text-sm text-gray-500 mt-1">{author || currentUser?.email || 'Anonymous'} &bull; {category}</div>
          {isPremium && <span className="inline-block mt-2 px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 rounded-full">Premium</span>}
          {imagePreview && <img src={imagePreview} alt="Preview" className="mt-4 w-full max-h-64 object-cover rounded" />}
          {summary && <p className="mt-4 text-gray-700 italic">{summary}</p>}
          {content ? (
            <div className="mt-4 text-gray-800 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: getFormattedPreviewHtml(content) }} />
          ) : (
            <p className="mt-4 text-gray-400 text-sm">Start typing content to see how it will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
