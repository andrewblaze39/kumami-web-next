'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, truncateContent } from './utils';

interface Draft {
  id: string;
  title: string;
  category: string;
  content: string;
  summary: string;
  imageUrl: string;
  author: string;
  isPremium: boolean;
  timestamp: { seconds: number; toDate?: () => Date } | null;
}

export default function NewsDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { userData } = useAuth();
  const router = useRouter();
  const isSuperAdmin = userData?.role === 'superadmin';

  useEffect(() => { fetchDrafts(); }, []);

  const fetchDrafts = async () => {
    try {
      const q = query(collection(db, 'news'), where('status', '==', 'draft'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Draft));
      list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setDrafts(list);
    } catch { setMessage('Error loading drafts'); }
    finally { setLoading(false); }
  };

  const handlePublish = async (id: string) => {
    try { setLoading(true); await updateDoc(doc(db, 'news', id), { status: 'published' }); setMessage('Draft published successfully!'); setDrafts((p) => p.filter((d) => d.id !== id)); } catch { setMessage('Error publishing draft'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure?')) return;
    try { setLoading(true); await deleteDoc(doc(db, 'news', id)); setMessage('Draft deleted successfully!'); setDrafts((p) => p.filter((d) => d.id !== id)); } catch { setMessage('Error deleting draft'); } finally { setLoading(false); }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">News Drafts</h2>
      {message && <div className={`mb-4 p-3 rounded-md text-center ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}
      {loading ? <p className="text-gray-600">Loading drafts...</p> : drafts.length === 0 ? <p className="text-gray-500 italic">No drafts found.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map((draft) => (
            <div key={draft.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {draft.imageUrl && <div className="h-48 overflow-hidden"><img src={draft.imageUrl} alt={draft.title} className="w-full h-full object-cover" /></div>}
              <div className="p-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{draft.title || 'Untitled Draft'}</h3>
                <p className="text-sm text-blue-600 font-medium mb-1">{draft.category}</p>
                <p className="text-gray-600 mb-4 line-clamp-2">{draft.summary || truncateContent(draft.content)}</p>
                <div className="flex justify-between text-sm text-gray-500 mb-3"><span>{draft.author}</span><span>{formatDate(draft.timestamp as Parameters<typeof formatDate>[0])}</span></div>
                {draft.isPremium && <span className="inline-block px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 rounded-full mb-3">Premium</span>}
                <div className="flex space-x-2 mt-4">
                  <button className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" onClick={() => router.push(`/admin/edit-news?id=${draft.id}`)}>Edit</button>
                  <button className={`flex-1 py-2 px-3 ${isSuperAdmin ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} rounded-md transition-colors`} onClick={() => isSuperAdmin && handlePublish(draft.id)} disabled={!isSuperAdmin}>Publish</button>
                  <button className="flex-1 py-2 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors" onClick={() => handleDelete(draft.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
