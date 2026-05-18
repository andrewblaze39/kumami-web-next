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
import { Send, Plus, Trash2, ChevronLeft, Lock } from 'lucide-react';

const PROMPT_SNIPPETS = [
  'Explain DeFi in simple terms',
  'What makes a good crypto portfolio?',
  'How do I evaluate a new altcoin?',
  'Explain Layer 1 vs Layer 2 blockchains',
  'What are the risks of yield farming?',
  'How does Bitcoin halving work?',
];

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
  alertData?: {
    direction: 'IN' | 'OUT';
    amount: string;
    asset: string;
    chainName: string;
    counterparty: string | null;
    usdValue: number;
    txHash: string | null;
    address: string;
  };
}

interface WalletStats {
  summary: { chain: string; ethBalance: string; nftCount: number; recentTxCount: number }[];
  holdings: { symbol: string; balance: string }[];
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

function ThresholdInput({ address, watchId, defaultValue, onSave, disabled }: {
  address: string; watchId: string; defaultValue: number;
  onSave: (val: number) => void; disabled: boolean;
}) {
  const [val, setVal] = useState(String(defaultValue));
  return (
    <div className="flex items-center gap-1" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 5, padding: '2px 6px' }}>
      <span style={{ color: `${WHALE_BLUE}60`, fontSize: 9 }}>🔔 $</span>
      <input
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { const n = parseInt(val, 10); if (!isNaN(n) && n >= 0) onSave(n); }}
        onKeyDown={e => { if (e.key === 'Enter') { const n = parseInt(val, 10); if (!isNaN(n) && n >= 0) onSave(n); } }}
        disabled={disabled}
        className="text-white outline-none"
        style={{ background: 'none', border: 'none', width: 40, fontSize: 9, textAlign: 'center' }}
      />
    </div>
  );
}

// ─── TrackerBotPanel ──────────────────────────────────────────────────────────
function TrackerBotPanel({ room, userId }: { room: ChatRoom; userId: string }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingIntent, setLoadingIntent] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'add_wallet' | 'whales' | null>(null);
  const [openSettingsId, setOpenSettingsId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [watchlist, setWatchlist] = useState<{ id: string; address: string; label: string; chains: string[]; minUsd?: number }[]>([]);
  const [selectedChains, setSelectedChains] = useState<('eth' | 'base' | 'arb')[]>(['eth', 'base', 'arb']);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [walletStats, setWalletStats] = useState<Record<string, WalletStats>>({});
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);

  const handleAddWallet = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!/^(0x[a-fA-F0-9]{40}|.+\.eth)$/.test(trimmed)) {
      alert('Please enter a valid 0x address or ENS name');
      return;
    }
    setInput('');
    setActiveModal(null);
    await handleIntent('input', 'watch_wallet', { address: trimmed, chains: selectedChains.join(',') });
  };

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

  useEffect(() => {
    if (!userId) return;
    const watchlistRef = collection(db, 'users', userId, 'watchlist');
    const unsub = onSnapshot(watchlistRef, (snap) => {
      setWatchlist(snap.docs.map(d => ({ id: d.id, address: d.data().address, label: d.data().label, chains: d.data().chains, minUsd: d.data().minUsd ?? 100 })));
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    watchlist.forEach(w => { fetchWalletStats(w.address); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.map(w => w.address).join(',')]);

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

  const fetchWalletStats = async (address: string): Promise<void> => {
    if (walletStats[address] || loadingStats[address]) return;
    setLoadingStats(prev => ({ ...prev, [address]: true }));
    try {
      const idToken = await currentUser?.getIdToken();
      const res = await fetch(`/api/wallet-data?address=${encodeURIComponent(address)}`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });
      if (res.ok) {
        const data: WalletStats = await res.json();
        setWalletStats(prev => ({ ...prev, [address]: data }));
      }
    } catch (err) {
      console.error('[wallet-data] fetch failed:', err);
    } finally {
      setLoadingStats(prev => ({ ...prev, [address]: false }));
    }
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

      {/* Watchlist control panel — always visible */}
      <div
        className="shrink-0 kuma-scroll overflow-y-auto"
        style={{ maxHeight: 220, padding: '10px 14px', borderBottom: `1px solid rgba(14,165,233,0.12)`, background: 'rgba(14,165,233,0.03)' }}
      >
        <p className="m-0 mb-2" style={{ color: `${WHALE_BLUE}66`, fontSize: 9, letterSpacing: '0.08em', fontWeight: 600 }}>
          WATCHING {watchlist.length}/20
        </p>
        {watchlist.length === 0 ? (
          <p className="text-[11px] m-0" style={{ color: 'rgba(255,255,255,0.3)' }}>No wallets yet. Use ➕ Add Wallet above.</p>
        ) : (
          watchlist.map((w) => {
            const isSettingsOpen = openSettingsId === w.id;
            const isDetailOpen = openDetailId === w.id;
            const displayName = w.label || `${w.address.slice(0, 6)}...${w.address.slice(-4)}`;
            const chainsLabel = (w.chains || []).join(' · ');
            const stats = walletStats[w.address];
            const isLoadingStats = loadingStats[w.address];
            const ethChain = stats?.summary.find(s => s.chain === 'eth');

            return (
              <div key={w.id} className="rounded-[8px] mb-1.5" style={{ background: isSettingsOpen || isDetailOpen ? 'rgba(14,165,233,0.07)' : 'rgba(14,165,233,0.04)', border: `1px solid rgba(14,165,233,${isSettingsOpen || isDetailOpen ? '0.2' : '0.1'})`, padding: '8px 10px' }}>
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setOpenDetailId(isDetailOpen ? null : w.id); setOpenSettingsId(null); if (!walletStats[w.address]) fetchWalletStats(w.address); }}
                    className="text-left flex items-center gap-1.5"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <span className="font-semibold" style={{ color: isDetailOpen ? WHALE_BLUE : `${WHALE_BLUE}B3`, fontSize: 11 }}>{displayName}</span>
                    {chainsLabel && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>{chainsLabel}</span>}
                    <span style={{ color: `${WHALE_BLUE}60`, fontSize: 9 }}>{isDetailOpen ? '▴' : '▾'}</span>
                  </button>
                  <button
                    onClick={() => { setOpenSettingsId(isSettingsOpen ? null : w.id); setOpenDetailId(null); }}
                    className="rounded-[5px] px-2 py-0.5 text-[9px] font-semibold transition-all"
                    style={{ background: isSettingsOpen ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.08)', border: `1px solid rgba(14,165,233,${isSettingsOpen ? '0.4' : '0.2'})`, color: isSettingsOpen ? WHALE_BLUE : `${WHALE_BLUE}99`, cursor: 'pointer' }}
                  >
                    ⚙ {isSettingsOpen ? '▴' : '▾'}
                  </button>
                </div>

                {/* Inline stats bar */}
                {!isDetailOpen && !isSettingsOpen && (
                  <div className="flex gap-2 mt-1.5" style={{ opacity: isLoadingStats ? 0.4 : 1 }}>
                    {isLoadingStats ? (
                      <span style={{ color: `${WHALE_BLUE}60`, fontSize: 9 }}>Loading...</span>
                    ) : stats ? (
                      <>
                        <span style={{ color: `${WHALE_BLUE}80`, fontSize: 9 }}>⬡ {ethChain?.ethBalance ?? '—'}</span>
                        {stats.holdings.slice(0, 2).map(h => (
                          <span key={h.symbol} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>{h.symbol}</span>
                        ))}
                        {ethChain && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>{ethChain.nftCount} NFTs</span>}
                      </>
                    ) : null}
                  </div>
                )}

                {/* Detail drawer */}
                {isDetailOpen && (
                  <div className="mt-2 pt-2" style={{ borderTop: `1px solid rgba(14,165,233,0.12)` }}>
                    {isLoadingStats ? (
                      <p style={{ color: `${WHALE_BLUE}60`, fontSize: 10, margin: 0 }}>Loading wallet data...</p>
                    ) : stats ? (
                      <>
                        {/* Per-chain breakdown */}
                        <div className="flex gap-1.5 mb-2">
                          {stats.summary.map(s => (
                            <div key={s.chain} className="flex-1 rounded-[5px] p-1.5 text-center" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.1)' }}>
                              <p className="m-0 font-bold" style={{ color: `${WHALE_BLUE}80`, fontSize: 8 }}>{s.chain.toUpperCase()}</p>
                              <p className="m-0 font-semibold text-white" style={{ fontSize: 10 }}>{s.ethBalance}</p>
                              <p className="m-0" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>{s.nftCount} NFTs · {s.recentTxCount} txs</p>
                            </div>
                          ))}
                        </div>
                        {/* Top holdings */}
                        {stats.holdings.length > 0 && (
                          <>
                            <p className="m-0 mb-1" style={{ color: `${WHALE_BLUE}50`, fontSize: 8, letterSpacing: '0.06em', fontWeight: 600 }}>TOP HOLDINGS</p>
                            {stats.holdings.map(h => (
                              <div key={h.symbol} className="flex justify-between py-0.5">
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600 }}>{h.symbol}</span>
                                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{h.balance}</span>
                              </div>
                            ))}
                          </>
                        )}
                        {/* Etherscan links */}
                        <div className="flex gap-2 mt-2">
                          {[
                            { chain: 'eth', label: 'Etherscan', url: `https://etherscan.io/address/${w.address}` },
                            { chain: 'base', label: 'Basescan', url: `https://basescan.org/address/${w.address}` },
                            { chain: 'arb', label: 'Arbiscan', url: `https://arbiscan.io/address/${w.address}` },
                          ].filter(l => (w.chains || []).includes(l.chain)).map(l => (
                            <a key={l.chain} href={l.url} target="_blank" rel="noopener noreferrer"
                              className="rounded-[4px] px-1.5 py-0.5 text-[8px] font-semibold"
                              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: `${WHALE_BLUE}80`, textDecoration: 'none' }}>
                              ↗ {l.label}
                            </a>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>Could not load wallet data.</p>
                    )}
                  </div>
                )}

                {/* Settings row */}
                {isSettingsOpen && (
                  <div className="mt-2 pt-2 flex gap-1.5 flex-wrap items-center" style={{ borderTop: `1px solid rgba(14,165,233,0.12)` }}>
                    {/* Chain toggles */}
                    {(['eth', 'base', 'arb'] as const).map(chain => {
                      const active = (w.chains || []).includes(chain);
                      return (
                        <button
                          key={chain}
                          onClick={() => {
                            const current: string[] = w.chains || [];
                            const next = active
                              ? current.filter(c => c !== chain)
                              : [...current, chain];
                            if (next.length === 0) return;
                            handleIntent(w.id, 'update_chains', { address: w.address, chains: next.join(',') });
                          }}
                          disabled={!!loadingIntent}
                          className="rounded-[4px] px-1.5 py-0.5 text-[9px] font-semibold transition-all disabled:opacity-50"
                          style={{ background: active ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.04)', border: `1px solid rgba(14,165,233,${active ? '0.4' : '0.15'})`, color: active ? WHALE_BLUE : `${WHALE_BLUE}60`, cursor: 'pointer' }}
                        >
                          {active ? '✓' : ''} {chain.toUpperCase()}
                        </button>
                      );
                    })}
                    {/* Threshold input */}
                    <ThresholdInput
                      address={w.address}
                      watchId={w.id}
                      defaultValue={w.minUsd ?? 100}
                      onSave={(val) => handleIntent(w.id, 'set_threshold', { address: w.address, value: String(val) })}
                      disabled={!!loadingIntent}
                    />
                    {/* Mute buttons */}
                    {(['1h', '4h', '24h'] as const).map(dur => (
                      <button
                        key={dur}
                        onClick={() => { handleIntent(w.id, 'mute_1h', { address: w.address, duration: dur }); setOpenSettingsId(null); }}
                        disabled={!!loadingIntent}
                        className="rounded-[5px] px-2 py-0.5 text-[9px] font-semibold disabled:opacity-50"
                        style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', color: `${WHALE_BLUE}99`, cursor: 'pointer' }}
                      >
                        🔕 {dur}
                      </button>
                    ))}
                    {/* Unwatch */}
                    <button
                      onClick={() => { handleIntent(w.id, 'unwatch_wallet', { address: w.address }); setOpenSettingsId(null); }}
                      disabled={!!loadingIntent}
                      className="rounded-[5px] px-2 py-0.5 text-[9px] font-semibold disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.8)', cursor: 'pointer' }}
                    >
                      ✕ Unwatch
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Alerts feed — read-only */}
      <div className="kuma-scroll flex-1 overflow-y-auto p-3">
        <p className="m-0 mb-2" style={{ color: `${WHALE_BLUE}66`, fontSize: 9, letterSpacing: '0.08em', fontWeight: 600 }}>
          LIVE ALERTS
        </p>
        {(() => {
          const alertMessages = messages.filter(
            (msg) => (!msg.buttons || msg.buttons.length === 0) && !msg.card
          );
          return alertMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6" style={{ color: `${WHALE_BLUE}60` }}>
              <span className="text-4xl mb-3">🐋</span>
              <p className="text-[13px]">Alerts will appear here when your watched wallets move.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertMessages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className="rounded-[10px] p-3"
                  style={{
                    background: 'rgba(14,165,233,0.05)',
                    border: `1px solid rgba(14,165,233,0.15)`,
                    borderLeft: `3px solid ${WHALE_BLUE}`,
                  }}
                >
                  {msg.alertData ? (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="m-0 text-[11px] font-bold" style={{ color: WHALE_BLUE }}>
                            {msg.alertData.direction === 'IN' ? '📥 Received' : '📤 Sent'}{' '}
                            <span className="text-white">{msg.alertData.amount} {msg.alertData.asset}</span>
                            <span style={{ color: `${WHALE_BLUE}80`, fontWeight: 400 }}> on {msg.alertData.chainName.toUpperCase()}</span>
                          </p>
                          {msg.alertData.counterparty && (
                            <p className="m-0 mt-0.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {msg.alertData.direction === 'IN' ? 'From' : 'To'}: {msg.alertData.counterparty.slice(0, 6)}...{msg.alertData.counterparty.slice(-4)}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {msg.alertData.usdValue > 0 && (
                            <p className="m-0 text-[11px] font-semibold" style={{ color: WHALE_BLUE }}>~${msg.alertData.usdValue.toLocaleString()}</p>
                          )}
                          <p className="m-0 text-[9px]" style={{ color: `${WHALE_BLUE}40` }}>{formatTime(msg.timestamp as FirestoreTimestamp | null)}</p>
                        </div>
                      </div>
                      {msg.alertData.txHash && (() => {
                        const explorerUrls: Record<string, string> = {
                          eth: `https://etherscan.io/tx/${msg.alertData!.txHash}`,
                          base: `https://basescan.org/tx/${msg.alertData!.txHash}`,
                          arb: `https://arbiscan.io/tx/${msg.alertData!.txHash}`,
                        };
                        const url = explorerUrls[msg.alertData!.chainName];
                        return url ? (
                          <div className="mt-1.5 flex gap-2">
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              className="rounded-[4px] px-1.5 py-0.5 text-[8px] font-semibold"
                              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: `${WHALE_BLUE}80`, textDecoration: 'none' }}>
                              ↗ Explorer
                            </a>
                          </div>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <>
                      <div className="text-[12px] text-white/80 leading-relaxed">
                        <SimpleMarkdown text={msg.message || msg.content || ''} className="kuma-md" />
                      </div>
                      <span className="text-[9px] mt-1 block" style={{ color: `${WHALE_BLUE}40` }}>
                        {formatTime(msg.timestamp as FirestoreTimestamp | null)}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Add Wallet panel */}
      {activeModal === 'add_wallet' && (
        <div
          className="shrink-0"
          style={{
            padding: '12px 16px',
            borderTop: `1px solid rgba(14,165,233,0.2)`,
            background: 'rgba(14,165,233,0.04)',
          }}
        >
          <p className="text-[11px] font-semibold mb-2 m-0" style={{ color: WHALE_BLUE }}>Add a wallet to watch</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddWallet(); if (e.key === 'Escape') { setActiveModal(null); setInput(''); } }}
              placeholder="Paste 0x address or ENS name..."
              autoFocus
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
          <div className="flex gap-1.5 mt-2">
            {(['eth', 'base', 'arb'] as const).map(chain => {
              const active = selectedChains.includes(chain);
              return (
                <button
                  key={chain}
                  onClick={() => setSelectedChains(prev =>
                    active
                      ? prev.length > 1 ? prev.filter(c => c !== chain) : prev
                      : [...prev, chain]
                  )}
                  className="rounded-[5px] px-2.5 py-1 text-[10px] font-semibold transition-all"
                  style={{ background: active ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.06)', border: `1px solid rgba(14,165,233,${active ? '0.5' : '0.2'})`, color: active ? WHALE_BLUE : `${WHALE_BLUE}60`, cursor: 'pointer' }}
                >
                  {active ? '✓ ' : ''}{chain.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Whales panel */}
      {activeModal === 'whales' && (
        <div
          className="shrink-0"
          style={{
            padding: '12px 16px',
            borderTop: `1px solid rgba(14,165,233,0.2)`,
            background: 'rgba(14,165,233,0.04)',
          }}
        >
          <p className="text-[11px] font-semibold mb-2 m-0" style={{ color: WHALE_BLUE }}>Browse curated whale wallets</p>
          <button
            onClick={async () => {
              setActiveModal(null);
              await handleIntent('whales-btn', 'browse_whales', { page: '0' });
            }}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            🐋 Show whale wallets
          </button>
        </div>
      )}

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10 gap-6">
            <div>
              <div
                className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-xl font-extrabold text-[#0a0a0f]"
                style={{ background: 'linear-gradient(135deg, #96EDD6, #7c3aed)' }}
              >
                K
              </div>
              <p className="text-white font-semibold text-[15px] m-0">How can I help you today?</p>
              <p className="text-white/40 text-sm m-0 mt-1">Ask me anything about crypto and Web3</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-[420px]">
              {PROMPT_SNIPPETS.map((snippet) => (
                <button
                  key={snippet}
                  onClick={() => {
                    setInputMessage(snippet);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  className="text-left p-3 rounded-xl text-xs text-white/60 leading-snug transition-all cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(150,237,214,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(150,237,214,0.2)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  }}
                >
                  {snippet}
                </button>
              ))}
            </div>
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
          padding: '12px 16px 14px',
          borderTop: '1px solid rgba(150,237,214,0.1)',
          background: '#0a0a0f',
        }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(150,237,214,0.18)',
            boxShadow: '0 0 0 0 rgba(150,237,214,0)',
            transition: 'box-shadow 0.2s, border-color 0.2s',
          }}
          onFocus={() => {}}
        >
          <textarea
            ref={inputRef}
            value={inputMessage}
            rows={1}
            onChange={(e) => {
              setInputMessage(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask Kuma AI anything..."
            disabled={isLoading}
            className="flex-1 text-[13px] text-white outline-none resize-none bg-transparent leading-relaxed"
            style={{ maxHeight: 120, overflowY: 'auto' }}
            onFocus={(e) => {
              const wrap = e.target.closest('div') as HTMLDivElement | null;
              if (wrap) {
                wrap.style.borderColor = 'rgba(150,237,214,0.5)';
                wrap.style.boxShadow = '0 0 0 3px rgba(150,237,214,0.08)';
              }
            }}
            onBlur={(e) => {
              const wrap = e.target.closest('div') as HTMLDivElement | null;
              if (wrap) {
                wrap.style.borderColor = 'rgba(150,237,214,0.18)';
                wrap.style.boxShadow = 'none';
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: inputMessage.trim() ? 'linear-gradient(135deg, #00c9a7, #0891b2)' : 'rgba(255,255,255,0.08)',
              border: 'none',
            }}
          >
            {isLoading ? (
              <div
                className="w-3.5 h-3.5 rounded-full animate-spin"
                style={{
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff',
                }}
              />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-white/20 mt-2 m-0">
          Press Enter to send · Shift+Enter for new line
        </p>
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
      // Clean up removed rooms (best-effort — may fail if rules deny delete)
      const removedRooms = ['smart-money-alerts'];
      for (const roomId of removedRooms) {
        try {
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
        } catch (e) {
          console.warn(`[ensureDefaults] could not clean up ${roomId}:`, e);
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

  return (
    <>
      <style>{globalStyles}</style>

      {/* Desktop */}
      <div
        className="hidden md:flex"
        style={{
          width: '100%',
          height: 'calc(100vh - var(--navbar-h) - var(--ticker-h) - 40px)',
          minHeight: 520,
          overflow: 'hidden',
          background: '#0a0a0f',
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
          height: 'calc(100vh - var(--navbar-h) - var(--ticker-h) - 58px)',
          minHeight: 400,
          overflow: 'hidden',
          background: '#0a0a0f',
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
