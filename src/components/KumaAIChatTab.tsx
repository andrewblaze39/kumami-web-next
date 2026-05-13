'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { Send, Plus, Trash2, MessageCircle, ChevronLeft, Lock } from 'lucide-react';

// ─── Styles ──────────────────────────────────────────────────────────────────
const globalStyles = `
  .kuma-md p:empty,
  .kuma-md br { display: none !important; }
  .kuma-md * { margin: 0 !important; padding: 0 !important; }
  .kuma-md p { margin-bottom: 0.5rem !important; }
  .kuma-md table {
    margin-top: 0.5rem !important;
    margin-bottom: 0.5rem !important;
    border-collapse: collapse;
  }
  .kuma-md th,
  .kuma-md td { padding: 0.25rem 0.5rem !important; border: 1px solid #4a5568; }
  .kuma-md ul {
    list-style-type: disc !important;
    padding-left: 1.5rem !important;
    margin-bottom: 0.5rem !important;
  }
  .kuma-md li { margin-bottom: 0.25rem !important; }
  .kuma-md strong { font-weight: bold; }
  .kuma-md h3 { font-weight: bold; font-size: 0.875rem; margin-top: 0.75rem; margin-bottom: 0.25rem; }
  .kuma-md p:last-child { margin-bottom: 0 !important; }

  @keyframes kuma-pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(150,237,214,0.5); }
    70% { box-shadow: 0 0 0 12px rgba(150,237,214,0); }
    100% { box-shadow: 0 0 0 0 rgba(150,237,214,0); }
  }
  @keyframes kuma-pulse-amber {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes kuma-glow-fade {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .kuma-pulse-ring { animation: kuma-pulse-ring 2s ease-out infinite; }
  .kuma-pulse-amber { animation: kuma-pulse-amber 1.8s ease-in-out infinite; }
  .kuma-glow-fade { animation: kuma-glow-fade 3s ease-in-out infinite; }

  .kuma-room-card:hover .kuma-delete-btn { opacity: 1 !important; }

  .kuma-scroll::-webkit-scrollbar { width: 4px; }
  .kuma-scroll::-webkit-scrollbar-track { background: transparent; }
  .kuma-scroll::-webkit-scrollbar-thumb { background: rgba(150,237,214,0.25); border-radius: 9999px; }
  .kuma-scroll::-webkit-scrollbar-thumb:hover { background: rgba(150,237,214,0.45); }
`;

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatRoom {
  id: string;
  name: string;
  icon: string;
  type: 'system' | 'user';
  isDefault: boolean;
  canDelete: boolean;
  hidden?: boolean;
  lastMessage?: string;
  lastMessageAt?: FirestoreTimestamp | null;
  createdAt?: FirestoreTimestamp | null;
}

interface FirestoreTimestamp {
  toDate: () => Date;
}

interface ButtonAction {
  label: string;
  intentId: string;
  args: Record<string, string>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'bot';
  message?: string;
  content?: string;
  timestamp?: FirestoreTimestamp | Date | null;
  isPending?: boolean;
  isError?: boolean;
  card?: {
    title: string;
    rows: { key: string; value: string }[];
  };
  buttons?: ButtonAction[];
  buttonsUsed?: boolean;       // true after any button in this message was clicked
}

// ─── Default rooms ───────────────────────────────────────────────────────────
const DEFAULT_ROOMS: Omit<ChatRoom, 'createdAt' | 'lastMessage' | 'lastMessageAt'>[] = [
  {
    id: 'tracker-bot',
    name: 'Crypto Address Tracker',
    icon: '🐋',
    type: 'system',
    isDefault: false,
    canDelete: false,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(timestamp: FirestoreTimestamp | Date | null | undefined): string {
  if (!timestamp) return '';
  const date = (timestamp as FirestoreTimestamp).toDate
    ? (timestamp as FirestoreTimestamp).toDate()
    : new Date(timestamp as unknown as string);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatPreviewTime(timestamp: FirestoreTimestamp | Date | null | undefined): string {
  if (!timestamp) return '';
  const date = (timestamp as FirestoreTimestamp).toDate
    ? (timestamp as FirestoreTimestamp).toDate()
    : new Date(timestamp as unknown as string);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Simple Markdown Renderer ────────────────────────────────────────────────
function SimpleMarkdown({ text, className }: { text: string; className?: string }) {
  const renderMarkdown = (md: string): string => {
    let html = md;
    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(150,237,214,0.15);padding:1px 4px;border-radius:3px;font-size:0.85em">$1</code>');
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#96EDD6;text-decoration:underline">$1</a>');
    // Unordered lists
    html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    // Tables
    html = html.replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match
        .split('|')
        .filter((c) => c.trim() !== '')
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return '';
      const cellTag = 'td';
      return `<tr>${cells.map((c) => `<${cellTag}>${c}</${cellTag}>`).join('')}</tr>`;
    });
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>');
    // Paragraphs
    html = html
      .split('\n\n')
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        if (
          trimmed.startsWith('<h') ||
          trimmed.startsWith('<ul') ||
          trimmed.startsWith('<table') ||
          trimmed.startsWith('<tr')
        )
          return trimmed;
        return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('');
    return html;
  };

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}

const WHALE_BLUE = '#0ea5e9';

// ─── TrackerBotPanel ──────────────────────────────────────────────────────────
function TrackerBotPanel({ room, userId }: { room: ChatRoom; userId: string }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingIntent, setLoadingIntent] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'add_wallet' | 'whales' | 'watchlist' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId || !room) return;
    const messagesRef = collection(db, 'users', userId, 'chatrooms', room.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
    return () => unsub();
  }, [userId, room]);

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }, [messages.length]);

  const handleIntent = async (msgId: string, intentId: string, args: Record<string, string>, buttonIndex = 0) => {
    if (loadingIntent) return;
    setLoadingIntent(`${msgId}-${intentId}-${buttonIndex}`);
    try {
      const idToken = await currentUser?.getIdToken();
      console.log('[handleIntent] currentUser:', currentUser?.uid ?? 'null', '| hasToken:', !!idToken);
      await fetch('/api/intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ intentId, args, roomId: room.id, sourceMsgId: msgId }),
      });
    } catch (err) {
      console.error('Intent error:', err);
    } finally {
      setLoadingIntent(null);
    }
  };

  const handleAddWallet = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!/^(0x[a-fA-F0-9]{40}|.+\.eth)$/.test(trimmed)) {
      alert('Please enter a valid 0x address or ENS name');
      return;
    }
    setInput('');
    await handleIntent('input', 'add_wallet', { address: trimmed });
  };

  return (
    <div className="flex flex-col kuma-scroll" style={{ height: '100%', background: '#0a0a0f' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid rgba(14,165,233,0.2)`, background: 'rgba(14,165,233,0.04)', flexShrink: 0 }}>
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🐋</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm m-0 tracking-wide" style={{ color: WHALE_BLUE }}>Crypto Address Tracker</p>
            <p className="text-[11px] m-0" style={{ color: `${WHALE_BLUE}80` }}>Real-time wallet alerts · ETH · Base · Arb</p>
          </div>
          <div className="kuma-pulse-amber" style={{ width: 7, height: 7, borderRadius: '50%', background: WHALE_BLUE, boxShadow: `0 0 6px ${WHALE_BLUE}99`, flexShrink: 0 }} />
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { label: '➕ Add Wallet', key: 'add_wallet' as const },
              { label: '🐋 Whales', key: 'whales' as const },
              { label: '📋 Watchlist', key: 'watchlist' as const },
            ].map(({ label, key }) => (
              <button
                key={key}
                onClick={() => setActiveModal(activeModal === key ? null : key)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: activeModal === key ? `rgba(14,165,233,0.25)` : `rgba(14,165,233,0.1)`,
                  border: `1px solid rgba(14,165,233,${activeModal === key ? '0.5' : '0.25'})`,
                  color: WHALE_BLUE,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="kuma-scroll flex-1 overflow-y-auto p-4 pb-2 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10" style={{ color: `${WHALE_BLUE}60` }}>
            <span className="text-4xl mb-3">🐋</span>
            <p className="text-[13px]">Crypto Address Tracker is ready. Add a wallet to get started.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={msg.id || idx}>
              {/* Message bubble */}
              <div className="p-3 rounded-[12px]" style={{ background: 'rgba(14,165,233,0.06)', border: `1px solid rgba(14,165,233,0.18)`, borderLeft: `3px solid ${WHALE_BLUE}` }}>
                {/* Card block */}
                {msg.card && (
                  <div className="mb-2 p-2.5 rounded-[8px]" style={{ background: 'rgba(14,165,233,0.1)', border: `1px solid rgba(14,165,233,0.25)` }}>
                    <p className="text-xs font-bold m-0 mb-1.5" style={{ color: WHALE_BLUE }}>{msg.card.title}</p>
                    {msg.card.rows.map((row, ri) => (
                      <div key={ri} className="flex justify-between text-[11px] py-0.5">
                        <span className="text-white/50">{row.key}</span>
                        <span className="text-white font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Text */}
                <div className="text-[13px] text-white leading-relaxed">
                  <SimpleMarkdown text={msg.message || msg.content || ''} className="kuma-md" />
                </div>
                <span className="text-[10px] mt-1.5 block" style={{ color: `${WHALE_BLUE}50` }}>
                  {formatTime(msg.timestamp as FirestoreTimestamp | null)}
                </span>
              </div>

              {/* Button rows */}
              {msg.buttons && msg.buttons.length > 0 && !msg.buttonsUsed && (
                <div className="mt-1.5 flex gap-1.5 flex-wrap">
                  {msg.buttons.map((btn, bi) => {
                    const loadKey = `${msg.id}-${btn.intentId}-${bi}`;
                    const isLoading = loadingIntent === loadKey;
                    return (
                      <button
                        key={`${btn.intentId}-${bi}`}
                        onClick={() => handleIntent(msg.id, btn.intentId, btn.args, bi)}
                        disabled={!!loadingIntent}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: isLoading ? `${WHALE_BLUE}30` : `rgba(14,165,233,0.12)`,
                          border: `1px solid rgba(14,165,233,0.35)`,
                          color: WHALE_BLUE,
                          cursor: loadingIntent ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={e => { if (!loadingIntent) (e.currentTarget as HTMLButtonElement).style.background = `rgba(14,165,233,0.22)` }}
                        onMouseLeave={e => { if (!loadingIntent) (e.currentTarget as HTMLButtonElement).style.background = `rgba(14,165,233,0.12)` }}
                      >
                        {isLoading ? '...' : btn.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {msg.buttonsUsed && msg.buttons && msg.buttons.length > 0 && (
                <p className="text-[10px] mt-1 ml-1" style={{ color: `${WHALE_BLUE}40` }}>✓ Action taken</p>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0" style={{ padding: '12px 16px', borderTop: `1px solid rgba(14,165,233,0.12)`, background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddWallet(); }}
            placeholder="Paste 0x address or ENS name..."
            className="flex-1 rounded-xl px-4 py-2.5 text-[13px] text-white outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(14,165,233,0.2)` }}
            onFocus={e => { e.target.style.borderColor = 'rgba(14,165,233,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.08)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(14,165,233,0.2)'; e.target.style.boxShadow = 'none'; }}
          />
          <button
            onClick={handleAddWallet}
            disabled={!input.trim()}
            className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none' }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ChatPanel ───────────────────────────────────────────────────────────────
function ChatPanel({ room, userId }: { room: ChatRoom; userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId || !room) return;
    if (unsubscribeRef.current) unsubscribeRef.current();

    const messagesRef = collection(db, 'users', userId, 'chatrooms', room.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
        .reverse();
      setMessages(msgs);
      const lastMsg = msgs[msgs.length - 1];
      setIsTyping(lastMsg?.role === 'user');
    });

    unsubscribeRef.current = unsub;
    return () => unsub();
  }, [userId, room]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [messages.length]);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [room]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 50 && visibleCount < messages.length) {
      setVisibleCount((prev) => Math.min(prev + 20, messages.length));
    }
  };

  const visibleMessages = messages.slice(-visibleCount);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !userId || isLoading) return;

    const messageText = inputMessage.trim();
    const tempId = `temp_${Date.now()}`;

    const optimistic: ChatMessage = {
      id: tempId,
      role: 'user',
      message: messageText,
      content: messageText,
      timestamp: new Date(),
      isPending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          metadata: {
            source: 'kumami-pro-dashboard',
            userId,
            chatRoomId: room.id,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
    } catch (error) {
      console.error('Send error:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I could not process your message. Please try again.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(150,237,214,0.12)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-base font-bold text-[#0a0a0f] shrink-0"
          style={{ background: 'linear-gradient(135deg, #96EDD6, #7c3aed)' }}
        >
          K
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white m-0 truncate">{room?.name}</p>
          <p className="text-[11px] text-[#96EDD6] m-0 opacity-70">Powered by Kuma AI</p>
        </div>
        <div
          className="kuma-glow-fade"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#96EDD6',
            boxShadow: '0 0 8px rgba(150,237,214,0.6)',
          }}
        />
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="kuma-scroll flex-1 overflow-y-auto p-4 pb-2"
      >
        {visibleCount < messages.length && (
          <p className="text-center text-[11px] text-white/25 pb-2">Scroll up to load more</p>
        )}

        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/25 text-center px-6 py-10">
            <MessageCircle className="w-[38px] h-[38px] mb-3 opacity-40" />
            <p className="text-[13px]">Start a conversation with Kuma AI</p>
          </div>
        ) : (
          visibleMessages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              className="mb-2.5"
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role !== 'user' && (
                <div
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold text-[#0a0a0f] shrink-0 mr-2 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #96EDD6, #7c3aed)' }}
                >
                  K
                </div>
              )}

              <div
                style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius:
                    msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  ...(msg.role === 'user'
                    ? { background: 'linear-gradient(135deg, #00c9a7, #0891b2)', color: '#fff' }
                    : msg.isError
                    ? {
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fca5a5',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(150,237,214,0.15)',
                        color: '#fff',
                      }),
                }}
              >
                {msg.role === 'user' ? (
                  <p className="text-[13px] leading-relaxed m-0 whitespace-pre-wrap">
                    {msg.message || msg.content}
                  </p>
                ) : (
                  <div className="text-[13px] leading-relaxed">
                    <SimpleMarkdown
                      text={msg.message || msg.content || ''}
                      className="kuma-md"
                    />
                  </div>
                )}
                <span
                  className="text-[10px] mt-1 block"
                  style={{
                    color:
                      msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                    opacity: msg.isPending ? 0 : 1,
                  }}
                >
                  {msg.isPending ? '...' : formatTime(msg.timestamp as FirestoreTimestamp | null)}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mb-2.5">
            <div
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold text-[#0a0a0f] shrink-0 mr-2 mt-0.5"
              style={{ background: 'linear-gradient(135deg, #96EDD6, #7c3aed)' }}
            >
              K
            </div>
            <div
              className="flex items-center gap-2.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(150,237,214,0.15)',
                borderRadius: '18px 18px 18px 4px',
                padding: '10px 16px',
              }}
            >
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="animate-bounce"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#96EDD6',
                      display: 'inline-block',
                      boxShadow: '0 0 6px rgba(150,237,214,0.5)',
                      animationDelay: `${delay}ms`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-[#96EDD6] opacity-80">Kuma AI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0"
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(150,237,214,0.12)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 rounded-xl px-4 py-2.5 text-[13px] text-white outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(150,237,214,0.2)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(150,237,214,0.6)';
              e.target.style.boxShadow = '0 0 0 3px rgba(150,237,214,0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(150,237,214,0.2)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #00c9a7, #0891b2)',
              border: 'none',
            }}
          >
            {isLoading ? (
              <div
                className="w-4 h-4 rounded-full animate-spin"
                style={{
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff',
                }}
              />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{
        background: '#0a0a0f',
        backgroundImage: 'radial-gradient(rgba(150,237,214,0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div
        className="kuma-pulse-ring w-16 h-16 rounded-full flex items-center justify-center text-[26px] font-extrabold text-[#0a0a0f] mb-5"
        style={{ background: 'linear-gradient(135deg, #96EDD6, #7c3aed)' }}
      >
        K
      </div>
      <p className="text-white text-[15px] font-semibold m-0 mb-1.5">Welcome to Kuma AI</p>
      <p className="text-[#96EDD6]/50 text-[13px] m-0">Select a session or start a new one</p>
    </div>
  );
}

// ─── RoomItem ────────────────────────────────────────────────────────────────
function RoomItem({
  room,
  isActive,
  onSelect,
  onDelete,
}: {
  room: ChatRoom;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (() => void) | null;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="kuma-room-card"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 10px',
        borderRadius: 10,
        cursor: 'pointer',
        marginBottom: 2,
        transition: 'background 0.15s, box-shadow 0.15s',
        background: isActive
          ? 'rgba(150,237,214,0.06)'
          : hovered
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.02)',
        border: isActive
          ? '1px solid rgba(150,237,214,0.4)'
          : '1px solid rgba(150,237,214,0.08)',
        borderLeft: isActive ? '3px solid #96EDD6' : '3px solid transparent',
        boxShadow: isActive ? '0 0 12px rgba(150,237,214,0.1)' : 'none',
      }}
    >
      <span className="text-[15px] shrink-0">{room.icon || '\uD83D\uDCAC'}</span>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs m-0 truncate"
          style={{
            fontWeight: isActive ? 600 : 500,
            color: isActive ? '#96EDD6' : 'rgba(255,255,255,0.8)',
          }}
        >
          {room.name}
        </p>
        {room.lastMessage ? (
          <p className="text-[10px] text-white/30 m-0 truncate">{room.lastMessage}</p>
        ) : null}
      </div>
      {room.lastMessageAt && (
        <span className="text-[9px] text-white/20 shrink-0">
          {formatPreviewTime(room.lastMessageAt)}
        </span>
      )}
      {onDelete && (
        <button
          className="kuma-delete-btn opacity-0 bg-transparent border-none cursor-pointer p-0.5 rounded-[5px] flex items-center transition-opacity shrink-0 hover:bg-red-500/20"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete session"
        >
          <Trash2 className="w-[13px] h-[13px] text-red-500" />
        </button>
      )}
    </div>
  );
}

// ─── KumaAIChatTab ───────────────────────────────────────────────────────────
export default function KumaAIChatTab() {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [mobilePanelView, setMobilePanelView] = useState<'sidebar' | 'chat'>('sidebar');

  // Ensure default rooms exist, then listen
  useEffect(() => {
    if (!userId) return;

    const ensureDefaults = async () => {
      // Clean up removed rooms
      const removedRooms = ['smart-money-alerts'];
      for (const roomId of removedRooms) {
        const roomRef = doc(db, 'users', userId, 'chatrooms', roomId);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const messagesRef = collection(db, 'users', userId, 'chatrooms', roomId, 'messages');
          const msgSnap = await getDocs(messagesRef);
          if (msgSnap.size > 0) {
            const batch = writeBatch(db);
            msgSnap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
          }
          await deleteDoc(roomRef);
        }
      }

      for (const room of DEFAULT_ROOMS) {
        const roomRef = doc(db, 'users', userId, 'chatrooms', room.id);
        await setDoc(
          roomRef,
          {
            id: room.id,
            name: room.name,
            icon: room.icon,
            type: room.type,
            isDefault: room.isDefault,
            canDelete: room.canDelete,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    };

    ensureDefaults().catch(console.error);

    const roomsRef = collection(db, 'users', userId, 'chatrooms');
    const q = query(roomsRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatRoom));
      setRooms(fetched);
    });

    return () => unsub();
  }, [userId]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  // Create room
  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !userId) return;
    try {
      const roomsRef = collection(db, 'users', userId, 'chatrooms');
      const newRef = doc(roomsRef);
      await setDoc(newRef, {
        id: newRef.id,
        name: newRoomName.trim(),
        icon: '\uD83D\uDCAC',
        type: 'user',
        isDefault: false,
        canDelete: true,
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
      });
      setSelectedRoomId(newRef.id);
      setNewRoomName('');
      setIsCreatingRoom(false);
      setMobilePanelView('chat');
    } catch (err) {
      console.error('Error creating room:', err);
    }
  };

  const handleCreateRoomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCreateRoom();
    if (e.key === 'Escape') {
      setIsCreatingRoom(false);
      setNewRoomName('');
    }
  };

  // Delete room
  const handleDeleteRoom = async (roomId: string) => {
    if (!userId) return;
    const room = rooms.find((r) => r.id === roomId);
    if (room?.isDefault) return;

    try {
      const messagesRef = collection(db, 'users', userId, 'chatrooms', roomId, 'messages');
      const msgSnap = await getDocs(messagesRef);
      if (msgSnap.size > 0) {
        const batch = writeBatch(db);
        msgSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, 'users', userId, 'chatrooms', roomId));

      if (selectedRoomId === roomId) {
        setSelectedRoomId('tracker-bot');
      }
    } catch (err) {
      console.error('Error deleting room:', err);
    }
  };

  const systemRooms = rooms.filter((r) => r.type === 'system');
  const userRooms = rooms.filter((r) => r.type !== 'system');

  // Sidebar component
  const ChatSidebar = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <div
      className="kuma-scroll flex flex-col h-full shrink-0 overflow-hidden"
      style={{
        width: fullWidth ? '100%' : 260,
        background: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid rgba(150,237,214,0.12)',
      }}
    >
      {/* Header */}
      <div
        className="shrink-0"
        style={{ padding: '16px 16px 14px', borderBottom: '1px solid rgba(150,237,214,0.1)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-extrabold"
              style={{
                background: 'linear-gradient(135deg, #96EDD6, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              Kuma AI
            </span>
            <div className="flex items-center gap-1">
              <div
                className="kuma-glow-fade"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#96EDD6',
                  boxShadow: '0 0 6px rgba(150,237,214,0.8)',
                }}
              />
              <span className="text-[10px] text-[#96EDD6] font-semibold tracking-widest">
                LIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Room list */}
      <div className="kuma-scroll flex-1 overflow-y-auto p-3 pt-3">
        {/* System rooms */}
        {systemRooms.filter(r => !r.hidden).map((room) => {
          const isTrackerBot = room.id === 'tracker-bot';
          const accent = isTrackerBot ? '#0ea5e9' : '#f59e0b';
          const accentRgb = isTrackerBot ? '14,165,233' : '245,158,11';
          return (
            <div
              key={room.id}
              onClick={() => {
                setSelectedRoomId(room.id);
                setMobilePanelView('chat');
              }}
              className="flex items-center gap-2 p-2.5 rounded-[10px] cursor-pointer mb-3 transition-all"
              style={{
                background:
                  selectedRoomId === room.id
                    ? `rgba(${accentRgb},0.1)`
                    : `rgba(${accentRgb},0.04)`,
                border:
                  selectedRoomId === room.id
                    ? `1px solid rgba(${accentRgb},0.4)`
                    : `1px solid rgba(${accentRgb},0.15)`,
                borderLeft:
                  selectedRoomId === room.id
                    ? `3px solid ${accent}`
                    : `3px solid rgba(${accentRgb},0.4)`,
              }}
            >
              <div className="relative shrink-0">
                <span className="text-[15px]">{room.icon}</span>
                <div
                  className="kuma-pulse-amber absolute -top-0.5 -right-1"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: accent,
                    boxShadow: `0 0 4px rgba(${accentRgb},0.7)`,
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold m-0 truncate" style={{ color: accent }}>{room.name}</p>
              </div>
              <Lock className="w-[11px] h-[11px] shrink-0" style={{ color: `rgba(${accentRgb},0.5)` }} />
            </div>
          );
        })}

        {/* My Sessions */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#96EDD6]/50 m-0 mb-2 ml-1">
            My Sessions
          </p>

          {isCreatingRoom && (
            <div className="mb-1.5">
              <input
                autoFocus
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={handleCreateRoomKeyDown}
                placeholder="Session name..."
                className="w-full rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(150,237,214,0.4)',
                }}
              />
              <div className="flex gap-1 mt-1">
                <button
                  onClick={handleCreateRoom}
                  disabled={!newRoomName.trim()}
                  className="flex-1 text-[11px] font-semibold py-1 rounded-md border-none text-[#0a0a0f] disabled:cursor-not-allowed transition-colors"
                  style={{
                    background: newRoomName.trim() ? '#96EDD6' : 'rgba(150,237,214,0.3)',
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreatingRoom(false);
                    setNewRoomName('');
                  }}
                  className="flex-1 text-[11px] font-semibold py-1 rounded-md border-none text-white/60 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {userRooms.length === 0 && !isCreatingRoom && (
            <p className="text-[11px] text-white/20 py-1 px-0.5 pb-2">No sessions yet.</p>
          )}

          {userRooms.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              isActive={selectedRoomId === room.id}
              onSelect={() => {
                setSelectedRoomId(room.id);
                setMobilePanelView('chat');
              }}
              onDelete={room.canDelete !== false ? () => handleDeleteRoom(room.id) : null}
            />
          ))}

          {!isCreatingRoom && (
            <button
              onClick={() => setIsCreatingRoom(true)}
              className="w-full mt-2 py-2 px-3 rounded-[10px] border border-dashed border-[#96EDD6]/30 bg-transparent text-[#96EDD6]/60 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-all hover:bg-[#96EDD6]/5 hover:border-[#96EDD6]/50 hover:text-[#96EDD6] hover:shadow-[0_0_10px_rgba(150,237,214,0.1)]"
            >
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const containerHeight = 'calc(100vh - 220px)';

  return (
    <>
      <style>{globalStyles}</style>

      {/* Desktop */}
      <div
        className="hidden md:flex"
        style={{
          width: '100%',
          height: containerHeight,
          minHeight: 520,
          borderRadius: 14,
          overflow: 'hidden',
          background: '#0a0a0f',
          backgroundImage: 'radial-gradient(rgba(150,237,214,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          border: '1px solid rgba(150,237,214,0.1)',
        }}
      >
        <ChatSidebar />
        <div className="flex-1 overflow-hidden h-full">
          {selectedRoom?.id === 'tracker-bot' ? (
            <TrackerBotPanel room={selectedRoom} userId={userId!} />
          ) : selectedRoom ? (
            <ChatPanel room={selectedRoom} userId={userId!} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Mobile */}
      <div
        className="flex md:hidden"
        style={{
          width: '100%',
          height: 'calc(100vh - 120px)',
          minHeight: 400,
          borderRadius: 14,
          overflow: 'hidden',
          background: '#0a0a0f',
          backgroundImage: 'radial-gradient(rgba(150,237,214,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          border: '1px solid rgba(150,237,214,0.1)',
        }}
      >
        {mobilePanelView === 'sidebar' ? (
          <div className="w-full h-full">
            <ChatSidebar fullWidth />
          </div>
        ) : (
          <div className="flex flex-col w-full h-full">
            <button
              onClick={() => setMobilePanelView('sidebar')}
              className="flex items-center gap-1 py-2.5 px-3.5 text-[#96EDD6] text-xs font-semibold cursor-pointer shrink-0 bg-transparent border-none"
              style={{ borderBottom: '1px solid rgba(150,237,214,0.12)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              All Rooms
            </button>
            <div className="flex-1 overflow-hidden">
              {selectedRoom?.id === 'tracker-bot' ? (
                <TrackerBotPanel room={selectedRoom} userId={userId!} />
              ) : selectedRoom ? (
                <ChatPanel room={selectedRoom} userId={userId!} />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
