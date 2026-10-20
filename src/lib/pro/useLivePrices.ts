'use client';

/**
 * useLivePrices — live spot prices via the public Binance WebSocket stream
 * (no API key, low latency). Give it a list of ticker symbols (e.g. ['BTC',
 * 'ETH']) and it returns a { SYMBOL: price } map that updates in real time.
 * Unsupported symbols are ignored. The socket auto-reconnects.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

// Symbols with a trading USDT spot pair on Binance that we monitor for alerts.
// Checked against Binance exchangeInfo on 20 Oct 2026 (Rachelle v1.15 Pro §2):
// HYPE added (a core asset); MATIC → POL and RNDR → RENDER were renamed and the
// old pairs are halted; TONUSDT is halted too, so TON was dropped.
export const SUPPORTED_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'HYPE', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'POL',
  'DOT', 'ARB', 'OP', 'LTC', 'TRX', 'NEAR', 'APT', 'SUI', 'INJ',
  'ATOM', 'UNI', 'AAVE', 'FIL', 'ETC', 'HBAR', 'ICP', 'RENDER', 'IMX', 'SEI',
]);

/** Old ticker → the symbol Binance streams now, so alerts saved on the old name keep working. */
export const RENAMED_SYMBOLS: Record<string, string> = { MATIC: 'POL', RNDR: 'RENDER' };

const streamSymbol = (sym: string): string => {
  const s = sym.trim().toUpperCase();
  return RENAMED_SYMBOLS[s] ?? s;
};

export function isSupportedSymbol(sym: string): boolean {
  return SUPPORTED_SYMBOLS.has(streamSymbol(sym));
}

export function useLivePrices(symbols: string[]): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>({});
  // Stable dependency key: sorted, de-duped, supported symbols only.
  const key = Array.from(new Set(symbols.map(streamSymbol)))
    .filter((s) => SUPPORTED_SYMBOLS.has(s))
    .sort()
    .join(',');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const syms = key ? key.split(',') : [];
    if (syms.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrices({});
      return;
    }
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const streams = syms.map((s) => `${s.toLowerCase()}usdt@miniTicker`).join('/');
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const s: string | undefined = msg?.data?.s;
          const c = parseFloat(msg?.data?.c);
          if (s && Number.isFinite(c)) {
            const sym = s.replace(/USDT$/, '');
            setPrices((prev) => (prev[sym] === c ? prev : { ...prev, [sym]: c }));
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (!closed) reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        try { ws.close(); } catch { /* noop */ }
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { wsRef.current?.close(); } catch { /* noop */ }
    };
  }, [key]);

  // Also answer under the old ticker (MATIC → POL's price) for alerts saved before the rename.
  return useMemo(() => {
    const out = { ...prices };
    for (const [old, now] of Object.entries(RENAMED_SYMBOLS)) if (out[now] != null) out[old] = out[now];
    return out;
  }, [prices]);
}
