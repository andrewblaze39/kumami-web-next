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

  const fmtTime = (ts?: { toDate: () => Date } | null) =>
    ts?.toDate
      ? new Date(ts.toDate()).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Just now';

  return (
    <div className="flex flex-col h-full text-gray-200">
      <div
        className="flex-1 flex flex-col-reverse overflow-y-auto"
        style={{
          maxHeight: 'calc(100vh - 200px)',
          padding: '20px 18px',
          gap: 14,
          borderRadius: 16,
          border: '1px solid rgba(120,200,170,.12)',
          background:
            'radial-gradient(circle at 20% 10%,rgba(185,164,255,.05),transparent 40%),radial-gradient(circle at 80% 90%,rgba(94,233,168,.04),transparent 40%),#0b1622',
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full py-10">
            <p style={{ color: '#8ea69c', fontSize: 13 }}>
              No alpha yet — the room is quiet. Check back when the market moves.
            </p>
          </div>
        ) : (
          messages.map((msg) =>
            msg.isSystem ? (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center' }}>
                <span
                  style={{
                    background: 'rgba(255,255,255,.06)',
                    color: '#8ea69c',
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '5px 14px',
                    borderRadius: 999,
                  }}
                >
                  {msg.message}
                </span>
              </div>
            ) : (
              <div key={msg.id} style={{ display: 'flex', gap: 10, maxWidth: 560 }}>
                <span
                  style={{
                    flex: 'none',
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#b9a4ff,#7c5cff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img src="/logo192.png" alt="Kumami" style={{ width: 22, height: 22 }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      background: '#16222f',
                      border: '1px solid rgba(255,255,255,.06)',
                      borderRadius: '4px 16px 16px 16px',
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: '#b9a4ff',
                        marginBottom: 6,
                      }}
                    >
                      {msg.user || 'Kumami Alpha'}
                    </div>
                    {msg.isImage ? (
                      <img
                        src={msg.message}
                        alt="Shared content"
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,.08)',
                          marginBottom: 8,
                        }}
                      />
                    ) : (
                      <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.5, color: '#f1f7f4' }}>
                        {msg.message}
                      </p>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        color: '#5f786e',
                        fontWeight: 600,
                        display: 'block',
                        textAlign: 'right',
                      }}
                    >
                      {fmtTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ),
          )
        )}
        <div ref={messagesEndRef} className="pt-4" />
      </div>
    </div>
  );
}
