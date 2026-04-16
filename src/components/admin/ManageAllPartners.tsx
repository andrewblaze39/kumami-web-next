'use client';

import { useEffect, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';

interface Partner { id: string; name: string; logoUrl: string; link: string; }

export default function ManageAllPartners() {
  const { currentUser, userData } = useAuth();
  const isSuperOrAdmin = ['superadmin', 'admin'].includes(userData?.role || '');
  const [partners, setPartners] = useState<Partner[]>([]);const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', link: '' });const [editingId, setEditingId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);const [logoPreview, setLogoPreview] = useState('');const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => { const fetch = async () => { try { const snap = await getDocs(query(collection(db, 'all_partners'))); const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Partner)).sort((a, b) => (a.name || '').localeCompare(b.name || '')); setPartners(list); setFilteredPartners(list); } catch { setError('Failed to load'); } finally { setLoading(false); } }; fetch(); }, []);

  const resetForm = () => { setFormData({ name: '', link: '' }); setLogoFile(null); setLogoPreview(''); setUploadProgress(0); setEditingId(null); };

  const uploadLogo = (file: File): Promise<string> => {
    const storageRef = ref(storage, `partner-logos/${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => { task.on('state_changed', (s) => setUploadProgress((s.bytesTransferred / s.totalBytes) * 100), reject, async () => resolve(await getDownloadURL(task.snapshot.ref))); });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isSuperOrAdmin) { setError('Admins only'); return; }
    setError('');
    try {
      let logoUrl: string | null = null;
      if (logoFile) logoUrl = await uploadLogo(logoFile);
      else if (!editingId) throw new Error('Upload a logo');
      if (editingId) { await updateDoc(doc(db, 'all_partners', editingId), { name: formData.name, ...(logoUrl ? { logoUrl } : {}), link: formData.link, updatedAt: serverTimestamp() }); }
      else { await addDoc(collection(db, 'all_partners'), { name: formData.name, logoUrl, link: formData.link, createdAt: serverTimestamp() }); }
      resetForm();
      const snap = await getDocs(query(collection(db, 'all_partners'))); const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Partner)).sort((a, b) => (a.name || '').localeCompare(b.name || '')); setPartners(list); setFilteredPartners(list);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
  };

  const handleEdit = (p: Partner) => { setFormData({ name: p.name || '', link: p.link || '' }); setLogoPreview(p.logoUrl || ''); setEditingId(p.id); };
  const handleDelete = async (id: string) => { if (!window.confirm('Delete?')) return; try { await deleteDoc(doc(db, 'all_partners', id)); setPartners((p) => p.filter((x) => x.id !== id)); setFilteredPartners((p) => p.filter((x) => x.id !== id)); } catch { setError('Failed to delete'); } };

  if (!isSuperOrAdmin) return <div className="p-8"><p className="text-gray-600">No permission.</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Manage All Partners</h2>
      {error && <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{editingId ? 'Edit' : 'Add'} Partner</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" name="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Logo</label><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }}} className="w-full text-sm text-gray-900" />{logoPreview && <img src={logoPreview} alt="Logo" className="mt-2 max-h-24 rounded" />}{uploadProgress > 0 && uploadProgress < 100 && <div className="text-xs"><progress value={uploadProgress} max="100" /> {Math.round(uploadProgress)}%</div>}</div>
        </div>
        <div className="mt-4"><label className="block text-sm font-medium text-gray-700 mb-1">Link</label><input type="url" value={formData.link} onChange={(e) => setFormData((p) => ({ ...p, link: e.target.value }))} className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900" required /></div>
        <div className="mt-4 flex gap-3"><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">{editingId ? 'Update' : 'Add'}</button>{editingId && <button type="button" onClick={resetForm} className="text-sm text-gray-600">Cancel</button>}</div>
      </form>
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Partners</h3>
        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => { const t = e.target.value.toLowerCase(); setSearchTerm(t); setFilteredPartners(partners.filter((p) => (p.name || '').toLowerCase().includes(t))); }} className="w-full p-3 border border-gray-300 rounded-lg text-black bg-white mb-4" />
        {loading ? <p className="text-sm text-gray-600">Loading...</p> : filteredPartners.length === 0 ? <p className="text-sm text-gray-600">No partners.</p> : (
          <div className="space-y-3">{filteredPartners.map((p) => (
            <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2">
              <div className="flex items-center gap-3">{p.logoUrl && <img src={p.logoUrl} alt={p.name} className="h-10 w-auto object-contain bg-black rounded p-1" />}<span className="font-medium text-sm text-gray-900">{p.name}</span></div>
              <div className="flex gap-2"><button onClick={() => handleEdit(p)} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">Edit</button><button onClick={() => handleDelete(p.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-700">Delete</button></div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}
