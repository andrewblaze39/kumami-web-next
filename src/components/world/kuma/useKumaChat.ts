'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface KumaChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UseKumaChatReturn {
  messages: KumaChatMessage[];
  typing: boolean;
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;
}

/**
 * The dock is permanently bound to this system chatroom under
 * users/{uid}/chatrooms. The same room shows up in the Pro dashboard's
 * Kuma AI Chat room list (it subscribes to all chatrooms), so conversations
 * are shared between the dock and the dashboard.
 */
const KUMA_ROOM_ID = 'kuma-ai';

interface FirestoreChatMessage {
  role?: 'user' | 'assistant' | 'bot';
  message?: string;
  content?: string;
}

/**
 * useKumaChat — shared message-list / send / typing state for Kuma AI chat UIs.
 *
 * Firestore-backed: subscribes to users/{uid}/chatrooms/kuma-ai/messages and
 * sends via the Kuma AI backend (Firebase Functions / Cloud Run), which writes
 * the assistant reply back into the same messages subcollection. Mirrors the
 * ChatPanel flow in KumaAIChatTab so both surfaces stay coherent.
 */
export function useKumaChat(): UseKumaChatReturn {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<KumaChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');

  // Ensure the kuma-ai room exists (create once — don't touch createdAt on
  // later mounts, so the room keeps its position in the dashboard room list).
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;
    const roomRef = doc(db, 'users', uid, 'chatrooms', KUMA_ROOM_ID);
    getDoc(roomRef)
      .then((snap) => {
        if (snap.exists()) return;
        return setDoc(roomRef, {
          id: KUMA_ROOM_ID,
          name: 'Kuma AI',
          icon: '🐻',
          type: 'system',
          isDefault: true,
          canDelete: false,
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
        });
      })
      .catch((err) => console.error('[useKumaChat] ensure room error:', err));
  }, [currentUser?.uid]);

  // Realtime message subscription (same pattern as ChatPanel).
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) {
      setMessages([]);
      return;
    }
    const messagesRef = collection(db, 'users', uid, 'chatrooms', KUMA_ROOM_ID, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: KumaChatMessage[] = snapshot.docs
        .map((d) => d.data() as FirestoreChatMessage)
        .reverse()
        .map((m): KumaChatMessage => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content ?? m.message ?? '',
        }))
        .filter((m) => m.content.trim() !== '');
      setMessages(msgs);
    });

    return () => unsub();
  }, [currentUser?.uid]);

  // Typing indicator: waiting on the backend to write the assistant reply.
  const lastRole = messages[messages.length - 1]?.role;
  const typing = sending || lastRole === 'user';

  const handleSend = useCallback(() => {
    const text = input.trim();
    const uid = currentUser?.uid;
    if (!text || !uid || sending) return;

    setInput('');
    // Optimistic append — replaced when the snapshot delivers the server copy.
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        metadata: {
          source: 'kumami-world-dock',
          userId: uid,
          chatRoomId: KUMA_ROOM_ID,
        },
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to send message');
      })
      .catch((err) => {
        console.error('[useKumaChat] send error:', err);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I could not process your message. Please try again.',
          },
        ]);
      })
      .finally(() => setSending(false));
  }, [input, currentUser?.uid, sending]);

  return { messages, typing, input, setInput, handleSend };
}
