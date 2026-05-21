'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface UserRecord {
  id: string;
  email: string;
  displayName?: string;
  name?: string;
  role?: string;
}

const PAGE_SIZE = 20;
const ROLES = [
  'superadmin',
  'admin',
  'gamesadmin',
  'newsresearchadmin',
  'newsdrafter',
  'marketanalysisadmin',
  'user',
];

export default function RoleManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showNormalUsers, setShowNormalUsers] = useState(false);
  const [page, setPage] = useState(0);
  const { userData } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserRecord)));
      } catch {
        setMessage({ text: 'Error loading users', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userData?.role !== 'superadmin') {
      setMessage({ text: 'Only superadmins can change roles', type: 'error' });
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setMessage({ text: 'Role updated successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch {
      setMessage({ text: 'Error updating role', type: 'error' });
    }
  };

  // Show non-user roles always; show regular users only if toggled or there's a search
  const filtered = users.filter((u) => {
    const role = u.role || 'user';
    const matchesSearch = searchQuery
      ? u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.displayName || u.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const passesRoleFilter = showNormalUsers || !!searchQuery ? true : role !== 'user';
    return matchesSearch && passesRoleFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, showNormalUsers]);

  if (loading) return <div className="p-6 text-white">Loading users...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-white">User Role Management</h2>

      {message.text && (
        <div
          className={`p-4 mb-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-900/40 text-green-300 border-green-700'
              : 'bg-red-900/40 text-red-300 border-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-full bg-[#1a1a1a] border border-white/20 p-3 px-5 text-white placeholder-gray-500 focus:outline-none focus:border-[#96EDD6] transition-colors"
        />
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer whitespace-nowrap px-2">
          <input
            type="checkbox"
            checked={showNormalUsers}
            onChange={(e) => setShowNormalUsers(e.target.checked)}
            className="accent-[#96EDD6] w-4 h-4"
          />
          Show regular users
        </label>
      </div>

      <p className="text-xs text-gray-600 mb-4">
        {filtered.length} user{filtered.length !== 1 ? 's' : ''} shown
        {!showNormalUsers && !searchQuery && ' — regular users hidden (toggle checkbox or search to reveal)'}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-[#0f1a1a]">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-semibold text-[#96EDD6]">Email</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-[#96EDD6]">Name</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-[#96EDD6]">Current Role</th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-[#96EDD6]">Change Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-[#0a0a0a]">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-gray-500 text-sm">
                  {searchQuery ? 'No users match your search.' : 'No privileged users found.'}
                </td>
              </tr>
            ) : (
              paginated.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-200">{user.email}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {user.displayName || user.name || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        (user.role || 'user') === 'user'
                          ? 'bg-gray-800 text-gray-400'
                          : 'bg-[#0a2020] text-[#96EDD6] border border-[#96EDD6]/30'
                      }`}
                    >
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={user.role || 'user'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={userData?.role !== 'superadmin'}
                      className="bg-[#0f0f0f] border border-white/20 rounded-lg p-2 text-sm text-white disabled:opacity-40 focus:outline-none focus:border-[#96EDD6] min-w-[190px]"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded border border-white/20 disabled:opacity-30 hover:border-[#96EDD6] hover:text-[#96EDD6] transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 rounded border border-white/20 disabled:opacity-30 hover:border-[#96EDD6] hover:text-[#96EDD6] transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
