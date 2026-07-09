'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Send, Lock, Sparkles } from 'lucide-react';
import { useWorldMode } from '@/contexts/WorldModeContext';
import { useAuth } from '@/contexts/AuthContext';
import KumaBear from '@/components/world/KumaBear';
import { useKumaChat } from './useKumaChat';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Constants ────────────────────────────────────────────────────────────────

const WIDTH_KEY = 'kumami_kuma_width';
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 320;
const MAX_WIDTH = 460;

const SAMPLE_PROMPTS = [
  "What's driving Bitcoin's price today?",
  "Explain Layer 2 scaling in simple terms",
  "Which altcoins have the most momentum?",
  "How do I read a crypto market cap chart?",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function readStoredWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (!raw) return DEFAULT_WIDTH;
    const n = parseInt(raw, 10);
    if (isNaN(n)) return DEFAULT_WIDTH;
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
  } catch {
    return DEFAULT_WIDTH;
  }
}

function persistWidth(uid: string | undefined, width: number) {
  try {
    localStorage.setItem(WIDTH_KEY, String(width));
  } catch {
    // ignore storage errors
  }
  if (!uid) return;
  // fire-and-forget to user_prefs/{uid}
  const ref = doc(db, 'user_prefs', uid);
  setDoc(ref, { kumaWidth: width }, { merge: true }).catch(() => {
    // ignore
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function KumaDock() {
  const { kumaOpen, setKumaOpen } = useWorldMode();
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const isPremium = userData?.isPremium;

  const { messages, typing, input, setInput, handleSend } = useKumaChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Width — read from localStorage once on mount; clean up CSS var on unmount
  const widthRef = useRef<number>(DEFAULT_WIDTH);
  useEffect(() => {
    widthRef.current = readStoredWidth();
    if (innerRef.current) {
      innerRef.current.style.width = `${widthRef.current}px`;
    }
    // update CSS var so the parent .w-kuma-side uses the correct width
    document.documentElement.style.setProperty('--kuma-w', `${widthRef.current}px`);
    return () => {
      document.documentElement.style.removeProperty('--kuma-w');
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Focus input when panel opens (premium only)
  useEffect(() => {
    if (kumaOpen && isPremium) {
      const t = setTimeout(() => inputRef.current?.focus(), 360);
      return () => clearTimeout(t);
    }
  }, [kumaOpen, isPremium]);

  // ── Resize drag handle ──────────────────────────────────────────────────────

  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef<number>(DEFAULT_WIDTH);

  // Helper to find the parent .w-kuma-side aside and toggle the dragging class
  const setDraggingClass = useCallback((active: boolean) => {
    const aside = innerRef.current?.closest<HTMLElement>('.w-kuma-side');
    if (!aside) return;
    if (active) aside.classList.add('dragging');
    else aside.classList.remove('dragging');
  }, []);

  const onDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = widthRef.current;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingClass(true);
  }, [setDraggingClass]);

  const onDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    // Dragging the left edge: moving pointer left increases width
    const delta = dragStartX.current - e.clientX;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
    widthRef.current = newWidth;
    document.documentElement.style.setProperty('--kuma-w', `${newWidth}px`);
    if (innerRef.current) innerRef.current.style.width = `${newWidth}px`;
  }, []);

  const onDragPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartX.current === null) return;
      dragStartX.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDraggingClass(false);
      persistWidth(currentUser?.uid, widthRef.current);
    },
    [currentUser, setDraggingClass]
  );

  // Cancel handler: reset state cleanly if drag is interrupted (e.g. system gesture)
  const onDragPointerCancel = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartX.current === null) return;
      dragStartX.current = null;
      setDraggingClass(false);
      persistWidth(currentUser?.uid, widthRef.current);
    },
    [currentUser, setDraggingClass]
  );

  const onDragLostPointerCapture = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStartX.current === null) return;
      dragStartX.current = null;
      setDraggingClass(false);
      persistWidth(currentUser?.uid, widthRef.current);
    },
    [currentUser, setDraggingClass]
  );

  // ── Upsell handler ──────────────────────────────────────────────────────────

  const handleUnlock = () => {
    router.push(currentUser ? '/world/subscribe' : '/signup');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Drag handle — sits on the left edge of the inner panel */}
      <div
        className="w-kuma-drag-handle"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerCancel}
        onLostPointerCapture={onDragLostPointerCapture}
        title="Drag to resize"
        aria-hidden="true"
      />

      <div ref={innerRef} className="w-kuma-inner">
        {/* ── Header ── */}
        <div className="w-kuma-header">
          <span className="w-kuma-av">
            <KumaBear width={36} height={36} />
          </span>
          <span className="w-kuma-title">
            <b>Kuma AI</b>
            <em>On-chain copilot · always on</em>
          </span>
          <button
            className="w-kuma-close"
            onClick={() => setKumaOpen(false)}
            aria-label="Close Kuma AI"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="w-kuma-body">
          {isPremium ? (
            /* ── Premium: full chat ── */
            <div className="w-kuma-messages">
              {messages.length === 0 && !typing && (
                <div className="w-kuma-empty">
                  <KumaBear width={44} height={44} className="w-kuma-empty-bear" />
                  <p className="w-kuma-empty-hint">Ask anything about crypto</p>
                  <div className="w-kuma-prompts">
                    {SAMPLE_PROMPTS.map(p => (
                      <button
                        key={p}
                        className="w-kuma-prompt-btn"
                        onClick={() => {
                          setInput(p);
                          inputRef.current?.focus();
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`w-kuma-msg ${msg.role === 'user' ? 'w-kuma-msg-user' : 'w-kuma-msg-bot'}`}
                >
                  {msg.role === 'assistant' && (
                    <span className="w-kuma-msg-av">
                      <KumaBear width={20} height={20} />
                    </span>
                  )}
                  <div className="w-kuma-bubble">{msg.content}</div>
                </div>
              ))}

              {typing && (
                <div className="w-kuma-msg w-kuma-msg-bot">
                  <span className="w-kuma-msg-av">
                    <KumaBear width={20} height={20} />
                  </span>
                  <div className="w-kuma-bubble w-kuma-typing-bubble">
                    <span className="w-kd" />
                    <span className="w-kd" />
                    <span className="w-kd" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* ── Non-premium: upsell ── */
            <div className="w-kuma-lock">
              <div className="w-kuma-lock-notice">
                <Lock size={13} className="w-kuma-lock-icon" />
                <span>
                  {currentUser
                    ? 'Unlock Kumami Pro to access Kuma AI'
                    : 'Sign up for Kumami Pro to access Kuma AI'}
                </span>
              </div>
              <p className="w-kuma-lock-hint">Try asking</p>
              <div className="w-kuma-prompts">
                {SAMPLE_PROMPTS.map(p => (
                  <button
                    key={p}
                    className="w-kuma-prompt-btn w-kuma-prompt-locked"
                    onClick={handleUnlock}
                  >
                    <Lock size={10} className="w-kuma-prompt-lock-ic" />
                    {p}
                  </button>
                ))}
              </div>
              <button className="w-kuma-unlock-btn" onClick={handleUnlock}>
                <Sparkles size={14} className="w-kuma-unlock-ic" />
                {currentUser ? 'Upgrade to Pro' : 'Sign Up Free'}
              </button>
            </div>
          )}
        </div>

        {/* ── Footer / input ── */}
        {isPremium && (
          <div className="w-kuma-footer">
            <div className="w-kuma-input-row">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Kuma anything…"
                className="w-kuma-input"
                aria-label="Message Kuma AI"
              />
              <button
                className="w-kuma-send"
                onClick={handleSend}
                disabled={!input.trim() || typing}
                aria-label="Send"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="w-kuma-disc">Kuma can be wrong · not financial advice</p>
          </div>
        )}
      </div>
    </>
  );
}
