'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface AlphaMessage {
  id: string;
  message: string;
  user?: string;
  isSystem?: boolean;
  isImage?: boolean;
  timestamp?: { toDate: () => Date } | null;
}

export default function AlphaRoom() {
  const [messages, setMessages] = useState<AlphaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'alphaRoom'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData: AlphaMessage[] = [];
      querySnapshot.forEach((docSnap) => {
        messagesData.push({ id: docSnap.id, ...docSnap.data() } as AlphaMessage);
      });
      setMessages(messagesData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#96EDD6]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-gray-200">
      <div
        className="flex-1 flex flex-col-reverse overflow-y-auto p-4 space-y-4 space-y-reverse"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No messages yet. Check back later for updates.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isSystem ? 'justify-center' : 'items-start'} space-x-3`}
            >
              {!msg.isSystem && (
                <img
                  src="/logo192.png"
                  alt="Kumami Logo"
                  className="h-8 w-8 rounded-full mt-1 flex-shrink-0"
                />
              )}
              <div className={`flex-1 ${msg.isSystem ? 'text-center' : ''}`}>
                {!msg.isSystem && (
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">{msg.user}</span>
                    <span className="text-xs text-gray-400">
                      {msg.timestamp?.toDate
                        ? new Date(msg.timestamp.toDate()).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Just now'}
                    </span>
                  </div>
                )}
                <div
                  className={`mt-1 text-sm ${
                    msg.isSystem
                      ? 'bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg inline-block'
                      : 'text-gray-200'
                  }`}
                >
                  {msg.isImage ? (
                    <img
                      src={msg.message}
                      alt="Shared content"
                      className="max-w-full h-auto rounded-lg border border-gray-700"
                    />
                  ) : (
                    msg.message
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} className="pt-4" />
      </div>
    </div>
  );
}
