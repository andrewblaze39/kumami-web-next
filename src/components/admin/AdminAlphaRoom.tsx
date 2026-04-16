'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Paperclip, X } from 'lucide-react';

interface Message { id: string; message: string; user: string; isImage?: boolean; isSystem?: boolean; timestamp: { toDate?: () => Date } | null; }

export default function AdminAlphaRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (!blob) continue;
          const reader = new FileReader();
          reader.onload = (ev) => setImagePreview(ev.target?.result as string);
          reader.readAsDataURL(blob);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  useEffect(() => {
    try {
      const q = query(collection(db, 'alphaRoom'), orderBy('timestamp', 'desc'));
      const unsub = onSnapshot(q, (snap) => { setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))); setIsLoading(false); }, () => setIsLoading(false));
      return () => unsub();
    } catch { setIsLoading(false); }
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !imagePreview) return;
    try {
      const data: Record<string, unknown> = { message: newMessage, timestamp: serverTimestamp(), user: 'Kumami World' };
      if (imagePreview) {
        setIsUploading(true);
        const res = await fetch(imagePreview); const blob = await res.blob();
        const file = new File([blob], 'pasted-image.png', { type: 'image/png' });
        const s = getStorage(); const r = ref(s, `alpha-room/${Date.now()}_${file.name}`);
        await uploadBytes(r, file); const url = await getDownloadURL(r);
        data.message = url; data.isImage = true;
      }
      await addDoc(collection(db, 'alphaRoom'), data);
      setNewMessage(''); setImagePreview(null);
    } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200">
      <div className="p-3 border-b border-gray-700"><h2 className="text-lg font-semibold">Alpha Room Manager</h2><p className="text-xs text-gray-400">Manage Alpha Room messages</p></div>
      <div className="flex-1 flex flex-col-reverse overflow-y-auto p-4 space-y-4 space-y-reverse" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {isLoading ? <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /><span className="ml-2">Loading...</span></div> :
        messages.length === 0 ? <div className="flex items-center justify-center h-full"><p className="text-gray-400">No messages yet.</p></div> :
        messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isSystem ? 'justify-center' : 'items-start'} space-x-3`}>
            {!msg.isSystem && <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">{(msg.user || 'A')[0]}</div>}
            <div className="flex-1">
              {!msg.isSystem && <div className="flex items-center space-x-2"><span className="font-semibold text-sm">{msg.user || 'Admin'}</span><span className="text-xs text-gray-400">{msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span></div>}
              <div className="mt-1 text-sm">{msg.isImage ? <img src={msg.message} alt="Shared" className="max-w-full h-auto rounded-lg border border-gray-700" /> : msg.message}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-gray-700 p-2">
        {imagePreview && <div className="relative mb-2 rounded-lg overflow-hidden border border-gray-600 bg-gray-800"><img src={imagePreview} alt="Preview" className="max-h-48 w-auto max-w-full mx-auto" /><button onClick={() => setImagePreview(null)} className="absolute top-2 right-2 bg-gray-900/80 text-white rounded-full p-1" type="button"><X size={16} /></button></div>}
        <form onSubmit={handleSend} className="flex items-end space-x-2">
          <div className="flex-1 flex items-center bg-gray-800 rounded-lg border border-gray-700">
            <button type="button" className="p-2 text-gray-400 hover:text-blue-400" onClick={() => fileInputRef.current?.click()}><Paperclip size={20} /><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f?.type.match('image.*')) { const r = new FileReader(); r.onload = (ev) => setImagePreview(ev.target?.result as string); r.readAsDataURL(f); }}} /></button>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message #alpha" className="flex-1 bg-transparent border-0 py-2 px-1 focus:outline-none text-gray-200 placeholder-gray-500" />
          </div>
          <button type="submit" className={`p-2 rounded-full ${(newMessage.trim() || imagePreview) ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-500/50 cursor-not-allowed'} text-white`} disabled={!newMessage.trim() && !imagePreview}>
            {isUploading ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <Send size={20} className="transform -rotate-45" />}
          </button>
        </form>
      </div>
    </div>
  );
}
