'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Sparkles, ArrowUp, EyeOff, Eye, ExternalLink, Send } from 'lucide-react';
import Image from 'next/image';

const SAMPLE_PROMPTS = [
  "What's driving Bitcoin's price today?",
  "Explain Layer 2 scaling in simple terms",
  "Which altcoins have the most momentum?",
  "How do I read a crypto market cap chart?",
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function KumaAIWidget() {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPremium = userData?.isPremium;

  // Close panel on outside click (only for non-pro lock panel)
  useEffect(() => {
    if (!expanded || isPremium) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded, isPremium]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleUnlock = () => {
    if (currentUser) {
      router.push('/subscribe');
    } else {
      router.push('/signup');
    }
  };

  const handleSend = () => {
    if (!input.trim() || typing) return;
    const userMsg = input.trim();
    setInput('');
    setExpanded(true);
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Kuma AI is almost here! Full AI-powered responses are coming soon for Pro members. Stay tuned — the full experience will be available in your Pro dashboard.",
      }]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      <style>{`
        @keyframes kuma-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kuma-typing {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40%            { opacity: 1;   transform: translateY(-3px); }
        }
        .kuma-widget-panel { animation: kuma-slide-up 0.2s cubic-bezier(0.34,1.4,0.64,1) both; }
        .kuma-messages::-webkit-scrollbar { width: 4px; }
        .kuma-messages::-webkit-scrollbar-track { background: transparent; }
        .kuma-messages::-webkit-scrollbar-thumb { background: rgba(150,237,214,0.2); border-radius: 2px; }
        .kuma-dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: rgba(150,237,214,0.6); animation: kuma-typing 1.2s infinite; }
        .kuma-dot:nth-child(2) { animation-delay: 0.2s; }
        .kuma-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* Hidden — restore button */}
      {hidden && (
        <button
          onClick={() => setHidden(false)}
          className="fixed bottom-5 right-5 z-[9999] rounded-full p-2.5"
          style={{
            background: 'linear-gradient(135deg, #102425 0%, #163332 100%)',
            border: '1px solid rgba(150,237,214,0.28)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
          aria-label="Show Kuma AI"
        >
          <Eye size={16} style={{ color: '#96EDD6' }} />
        </button>
      )}

      <div
        ref={panelRef}
        className="fixed bottom-5 left-1/2 z-[9999]"
        style={{
          transform: 'translateX(-50%)',
          width: 'min(480px, calc(100vw - 32px))',
          display: hidden ? 'none' : undefined,
        }}
      >
        {/* Expanded panel */}
        {expanded && (
          <div
            className="kuma-widget-panel mb-2 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(160deg, #102425 0%, #0d1e1f 100%)',
              border: '1px solid rgba(150,237,214,0.25)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.65)',
              height: isPremium ? '360px' : 'auto',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(150,237,214,0.12)' }}>
              <Image src="/logo k.png" alt="Kumami" width={20} height={20} className="object-contain" />
              <span className="text-sm font-black uppercase tracking-widest" style={{ color: '#96EDD6' }}>Kuma AI</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(150,237,214,0.12)', color: '#96EDD6' }}>Pro</span>
              <button
                onClick={() => { sessionStorage.setItem('proTab', 'kumaai'); router.push('/pro'); }}
                className="ml-auto flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-opacity"
                style={{ background: 'rgba(150,237,214,0.1)', color: '#96EDD6', border: '1px solid rgba(150,237,214,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <ExternalLink size={11} />
                View Full Page
              </button>
            </div>

            {isPremium ? (
              /* ── Pro: messages only, no input here ── */
              <div className="kuma-messages flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
                {messages.length === 0 && !typing && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <Image src="/logo k.png" alt="Kumami" width={28} height={28} className="object-contain mb-3 opacity-30" />
                    <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Ask anything about crypto</p>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {SAMPLE_PROMPTS.map(p => (
                        <button
                          key={p}
                          onClick={() => { inputRef.current?.focus(); inputRef.current && (inputRef.current.value = p); setInput(p); }}
                          className="text-left text-xs rounded-xl px-3 py-2 transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(150,237,214,0.12)', color: 'rgba(255,255,255,0.45)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(150,237,214,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <Image src="/logo k.png" alt="" width={16} height={16} className="object-contain mb-0.5 flex-shrink-0 opacity-60" />
                    )}
                    <div
                      className="max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                      style={msg.role === 'user'
                        ? { background: 'rgba(150,237,214,0.15)', color: 'rgba(255,255,255,0.9)', borderBottomRightRadius: 4 }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', borderBottomLeftRadius: 4 }
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {typing && (
                  <div className="flex items-end gap-2 justify-start">
                    <Image src="/logo k.png" alt="" width={16} height={16} className="object-contain mb-0.5 flex-shrink-0 opacity-60" />
                    <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4 }}>
                      <span className="kuma-dot" style={{ marginRight: 3 }} />
                      <span className="kuma-dot" style={{ marginRight: 3 }} />
                      <span className="kuma-dot" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            ) : (
              /* ── Non-pro: lock state ── */
              <div className="px-4 pt-4 pb-4">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4" style={{ background: 'rgba(150,237,214,0.07)', border: '1px solid rgba(150,237,214,0.15)' }}>
                  <Lock size={13} style={{ color: '#96EDD6', flexShrink: 0 }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {currentUser ? 'Unlock Kumami Pro to access Kuma AI' : 'Sign up for Kumami Pro to access Kuma AI'}
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Try asking</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {SAMPLE_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={handleUnlock}
                      className="text-left rounded-xl px-3 py-2.5 text-xs transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(150,237,214,0.12)', color: 'rgba(255,255,255,0.5)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(150,237,214,0.08)'; e.currentTarget.style.borderColor = 'rgba(150,237,214,0.28)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(150,237,214,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                      <Lock size={10} className="inline-block mr-1 opacity-40" />{p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleUnlock}
                  className="w-full rounded-xl py-2.5 text-sm font-bold transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #96EDD6 0%, #40E0D0 100%)', color: '#0a0a0f' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <Sparkles size={14} className="inline-block mr-1.5 -mt-0.5" />
                  {currentUser ? 'Upgrade to Pro' : 'Sign Up Free'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-2"
            style={{
              background: 'linear-gradient(135deg, #102425 0%, #163332 100%)',
              border: '1px solid rgba(150,237,214,0.28)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            <Image src="/logo k.png" alt="Kumami" width={22} height={22} className="object-contain flex-shrink-0" />

            {isPremium ? (
              /* Real input for pro users */
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setExpanded(true)}
                  placeholder="Ask Kuma AI anything..."
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'rgba(255,255,255,0.85)', caretColor: '#96EDD6' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || typing}
                  className="flex-shrink-0 rounded-full p-1.5 transition-all"
                  style={{ background: input.trim() && !typing ? 'linear-gradient(135deg, #96EDD6, #40E0D0)' : 'rgba(150,237,214,0.15)' }}
                >
                  <Send size={14} style={{ color: input.trim() && !typing ? '#0a0a0f' : '#96EDD6' }} />
                </button>
              </>
            ) : (
              /* Fake placeholder for non-pro — opens lock panel */
              <>
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="flex-1 text-left text-sm"
                  style={{ color: 'rgba(255,255,255,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Ask Kuma AI anything...
                </button>
                <div className="flex-shrink-0 rounded-full p-1.5" style={{ background: 'rgba(150,237,214,0.15)' }}>
                  <ArrowUp size={14} style={{ color: '#96EDD6' }} />
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => { setExpanded(false); setHidden(true); }}
            className="flex-shrink-0 p-2 rounded-full transition-colors"
            style={{
              color: 'rgba(255,255,255,0.25)',
              background: 'rgba(16,36,37,0.9)',
              border: '1px solid rgba(150,237,214,0.15)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
            aria-label="Hide Kuma AI"
          >
            <EyeOff size={14} />
          </button>
        </div>

        {isPremium && (
          <p className="text-center mt-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Kuma AI can make mistakes. Not financial advice.
          </p>
        )}
      </div>
    </>
  );
}
