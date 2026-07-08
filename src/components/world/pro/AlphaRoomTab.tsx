'use client';

/**
 * AlphaRoomTab — Kumami World port of the CRA Alpha Room
 * (kumami-web/src/pages/Pro/AlphaRoom.js).
 *
 * Read-only onSnapshot feed of the `alphaRoom` collection ordered by
 * timestamp desc (data contract unchanged for CRA interop). Restyled with
 * world tokens (panel surface, 18px radius, turquoise accent).
 */

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

export default function AlphaRoomTab() {
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

  // Scroll to bottom on initial load (CRA parity)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  return (
    <div
      className="flex flex-col"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius, 18px)',
        minHeight: 320,
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center flex-1 py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c2c7]" />
        </div>
      ) : (
        <div
          className="flex-1 flex flex-col-reverse overflow-y-auto p-4 space-y-4 space-y-reverse text-[color:var(--ink)]"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full py-16">
              <p className="text-white/50">No messages yet. Check back later for updates.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isSystem ? 'justify-center' : 'items-start'} space-x-3`}
              >
                {!msg.isSystem && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/logo192.png"
                    alt="Kumami Logo"
                    className="h-8 w-8 rounded-full mt-1 flex-shrink-0"
                  />
                )}
                <div className={`flex-1 ${msg.isSystem ? 'text-center' : ''}`}>
                  {!msg.isSystem && (
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-white">{msg.user}</span>
                      <span className="text-xs text-white/50">
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
                        ? 'bg-[#00c2c7]/10 text-[#00c2c7] px-3 py-1 rounded-lg inline-block'
                        : 'text-white/85'
                    }`}
                  >
                    {msg.isImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={msg.message}
                        alt="Shared content"
                        className="max-w-full h-auto rounded-lg"
                        style={{ border: '1px solid var(--border-2)' }}
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
      )}
    </div>
  );
}
