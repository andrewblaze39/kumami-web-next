'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, truncateContent } from './utils';

interface Draft { id: string; title: string; category?: string; description?: string; imageUrl?: string; thumbnail?: string; author?: string; level?: string; isPremium?: boolean; createdAt: { seconds: number; toDate?: () => Date } | null; [key: string]: unknown; }

export default function AIModuleDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { userData } = useAuth();
  const router = useRouter();
  const isSuperAdmin = userData?.role === 'superadmin';

  useEffect(() => { fetchDrafts(); }, []);

  const fetchDrafts = async () => {
    try {
      const q = query(collection(db, 'ai_modules'), where('status', '==', 'draft'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Draft));
      list.sort((a, b) => ((b.createdAt as { seconds: number } | null)?.seconds || 0) - ((a.createdAt as { seconds: number } | null)?.seconds || 0));
      setDrafts(list);
    } catch { setMessage('Error loading drafts'); }
    finally { setLoading(false); }
  };

  const handlePublish = async (id: string) => { try { setLoading(true); await updateDoc(doc(db, 'ai_modules', id), { status: 'published' }); setMessage('AI Module draft published!'); setDrafts((p) => p.filter((d) => d.id !== id)); } catch { setMessage('Error publishing'); } finally { setLoading(false); } };
  const handleDelete = async (id: string) => { if (!window.confirm('Delete this draft?')) return; try { setLoading(true); await deleteDoc(doc(db, 'ai_modules', id)); setMessage('Draft deleted!'); setDrafts((p) => p.filter((d) => d.id !== id)); } catch { setMessage('Error deleting'); } finally { setLoading(false); } };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">AI Module Drafts</h2>
      {message && <div className={`mb-4 p-3 rounded-md text-center ${message.includes('!') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}
      {loading ? <p className="text-gray-600">Loading...</p> : drafts.length === 0 ? <p className="text-gray-500 italic">No drafts found.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map((draft) => (
            <div key={draft.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {(draft.imageUrl || draft.thumbnail) && <div className="h-48 overflow-hidden"><img src={draft.imageUrl || draft.thumbnail || ''} alt={draft.title} className="w-full h-full object-cover" /></div>}
              <div className="p-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{draft.title || 'Untitled Draft'}</h3>
                <p className="text-sm text-blue-600 font-medium mb-1">{draft.category || draft.level}</p>
                <p className="text-gray-600 mb-4 line-clamp-2">{truncateContent(draft.description || draft.title || '')}</p>
                <div className="flex justify-between text-sm text-gray-500 mb-3"><span>{draft.author || 'Unknown'}</span><span>{formatDate(draft.createdAt as Parameters<typeof formatDate>[0])}</span></div>
                <div className="flex space-x-2 mt-4">
                  <button className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" onClick={() => router.push('/admin/edit-ai-modules?id=' + draft.id)}>Edit</button>
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
