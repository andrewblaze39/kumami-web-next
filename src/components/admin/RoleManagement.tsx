'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface UserRecord { id: string; email: string; displayName?: string; name?: string; role?: string; }

export default function RoleManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const { userData } = useAuth();

  useEffect(() => { const fetch = async () => { try { const snap = await getDocs(collection(db, 'users')); setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserRecord))); } catch { setMessage({ text: 'Error loading users', type: 'error' }); } finally { setLoading(false); } }; fetch(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userData?.role !== 'superadmin') { setMessage({ text: 'Only superadmins can change roles', type: 'error' }); return; }
    try { await updateDoc(doc(db, 'users', userId), { role: newRole }); setUsers((p) => p.map((u) => u.id === userId ? { ...u, role: newRole } : u)); setMessage({ text: 'Role updated', type: 'success' }); } catch { setMessage({ text: 'Error updating role', type: 'error' }); }
  };

  const filtered = users.filter((u) => u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || (u.displayName || u.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="p-6">Loading users...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-black">User Role Management</h2>
      {message.text && <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message.text}</div>}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <input type="text" placeholder="Search by email or name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-full border border-gray-300 p-3 px-5 text-black placeholder-gray-400 focus:outline-none focus:border-blue-500" />
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-800 text-white"><tr><th className="py-3 px-4 text-left">Email</th><th className="py-3 px-4 text-left">Current Role</th><th className="py-3 px-4 text-left">Change Role</th></tr></thead>
          <tbody className="divide-y divide-gray-200 text-black">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">{user.email}</td>
                <td className="py-3 px-4 capitalize">{user.role || 'user'}</td>
                <td className="py-3 px-4"><select value={user.role || 'user'} onChange={(e) => handleRoleChange(user.id, e.target.value)} disabled={userData?.role !== 'superadmin'} className="border rounded p-2 disabled:opacity-50 min-w-[180px]"><option value="superadmin">Super Admin</option><option value="admin">Admin</option><option value="gamesadmin">Games Admin</option><option value="newsresearchadmin">News & Research Admin</option><option value="newsdrafter">News Drafter</option><option value="marketanalysisadmin">Market Analysis Admin</option><option value="user">User</option></select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
