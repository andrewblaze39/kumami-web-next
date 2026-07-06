'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

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

const STUB_RESPONSE =
  "Kuma AI is almost here! Full AI-powered responses are coming soon for Pro members. Stay tuned — the full experience will be available in your Pro dashboard.";

/**
 * useKumaChat — shared message-list / send / typing state for Kuma AI chat UIs.
 *
 * Extracted from KumaAIWidget so the same logic can be consumed by both the
 * floating widget and the KumaDock side panel without forking.
 *
 * Current behaviour: sends to a stub (setTimeout) that returns a fixed message.
 * When a real AI endpoint is wired up, replace the sendMessage body; the hook
 * contract stays identical.
 */
export function useKumaChat(): UseKumaChatReturn {
  const [messages, setMessages] = useState<KumaChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');

  // Keep a ref to the stub timer so we can cancel it on unmount
  const stubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (stubTimerRef.current !== null) {
        clearTimeout(stubTimerRef.current);
      }
    };
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || typing) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setTyping(true);

    // Stub: simulate an async round-trip.
    // Replace this block with a real fetch('/api/chat', ...) when the endpoint exists.
    stubTimerRef.current = setTimeout(() => {
      stubTimerRef.current = null;
      setTyping(false);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: STUB_RESPONSE },
      ]);
    }, 1000);
  }, [input, typing]);

  return { messages, typing, input, setInput, handleSend };
}
