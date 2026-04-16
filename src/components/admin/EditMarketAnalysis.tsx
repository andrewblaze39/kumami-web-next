'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

interface MarketItem { id: string; title: string; content: string; [key: string]: unknown; }

export default function EditMarketAnalysis() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => { const snap = await getDocs(collection(db, 'marketAnalysis')); setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MarketItem))); setLoading(false); };
    fetch();
  }, []);

  const handleChange = (id: string, field: string, value: string) => setItems((p) => p.map((i) => i.id === id ? { ...i, [field]: value } : i));
  const handleSave = async (id: string) => { const item = items.find((i) => i.id === id); if (!item) return; await updateDoc(doc(db, 'marketAnalysis', id), { title: item.title, content: item.content }); alert('Updated!'); };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Market Analysis</h2>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800 text-white"><tr><th className="py-3 px-4 text-left">Title</th><th className="py-3 px-4 text-left">Content</th><th className="py-3 px-4 text-left">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-200 text-gray-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="py-3 px-4"><input type="text" value={item.title} onChange={(e) => handleChange(item.id, 'title', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" /></td>
                <td className="py-3 px-4"><textarea value={item.content} onChange={(e) => handleChange(item.id, 'content', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md h-32" /></td>
                <td className="py-3 px-4"><button onClick={() => handleSave(item.id)} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Save</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
