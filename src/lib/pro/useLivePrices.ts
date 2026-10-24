'use client';

/**
 * Live spot prices via Binance miniTicker. Every mounted consumer in a tab shares
 * one combined-stream socket, preserving the source payload while avoiding one
 * socket per tile/panel. Server market engines remain responsible for rules and
 * slower analytics; this hook only supplies verified spot price/24h movement.
 */
import { useEffect, useMemo, useState } from 'react';
import { mergeLivePrice, parseMiniTicker, priceFreshness, type LivePrice } from './livePriceFeed';

// Symbols with a trading USDT spot pair on Binance that we monitor for alerts.
export const SUPPORTED_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'HYPE', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'POL',
  'DOT', 'ARB', 'OP', 'LTC', 'TRX', 'NEAR', 'APT', 'SUI', 'INJ',
  'ATOM', 'UNI', 'AAVE', 'FIL', 'ETC', 'HBAR', 'ICP', 'RENDER', 'IMX', 'SEI',
]);

/** Old ticker → the symbol Binance streams now, so saved alerts keep working. */
export const RENAMED_SYMBOLS: Record<string, string> = { MATIC: 'POL', RNDR: 'RENDER' };

const streamSymbol = (sym: string): string => {
  const s = sym.trim().toUpperCase();
  return RENAMED_SYMBOLS[s] ?? s;
};

export function isSupportedSymbol(sym: string): boolean {
  return SUPPORTED_SYMBOLS.has(streamSymbol(sym));
}

type FeedStatus = 'idle' | 'connecting' | 'live' | 'reconnecting';
type FeedSnapshot = { prices: Record<string, LivePrice>; status: FeedStatus };

let snapshot: FeedSnapshot = { prices: {}, status: 'idle' };
const listeners = new Set<() => void>();
const subscriptions = new Map<number, Set<string>>();
let nextSubscription = 1;
let socket: WebSocket | null = null;
let activeKey = '';
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let reconfigureQueued = false;
let priceNotificationTimer: ReturnType<typeof setTimeout> | undefined;

function notify(): void {
  listeners.forEach((listener) => listener());
}

function setStatus(status: FeedStatus): void {
  if (snapshot.status === status) return;
  snapshot = { ...snapshot, status };
  notify();
}

/** Prevent a busy market from forcing React renders more than once per second. */
function notifyPrices(): void {
  if (priceNotificationTimer) return;
  priceNotificationTimer = setTimeout(() => {
    priceNotificationTimer = undefined;
    notify();
  }, 1_000);
}

function requestedSymbols(): string[] {
  return [...new Set([...subscriptions.values()].flatMap((symbols) => [...symbols]))].sort();
}

function stopSocket(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  if (socket) {
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.close();
    socket = null;
  }
}

function connect(): void {
  const symbols = requestedSymbols();
  const key = symbols.join(',');
  if (!key || key !== activeKey) return;
  setStatus(snapshot.status === 'idle' ? 'connecting' : 'reconnecting');
  const streams = symbols.map((symbol) => `${symbol.toLowerCase()}usdt@miniTicker`).join('/');
  const expectedSymbols = new Set(symbols);
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
  socket = ws;

  ws.onopen = () => {
    if (socket === ws) setStatus('live');
  };
  ws.onmessage = (event) => {
    try {
      if (socket !== ws) return;
      const tick = parseMiniTicker(JSON.parse(event.data));
      if (!tick || !expectedSymbols.has(tick.symbol)) return;
      snapshot = { ...snapshot, prices: mergeLivePrice(snapshot.prices, tick) };
      notifyPrices();
    } catch {
      // Ignore malformed frames: never manufacture an invalid price from one.
    }
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    if (!requestedSymbols().length) {
      setStatus('idle');
      return;
    }
    setStatus('reconnecting');
    reconnectTimer = setTimeout(connect, 2_000);
  };
  ws.onerror = () => {
    try { ws.close(); } catch { /* noop */ }
  };
}

function reconfigureNow(): void {
  const key = requestedSymbols().join(',');
  if (key === activeKey && (socket || !key)) return;
  activeKey = key;
  stopSocket();
  if (!key) {
    setStatus('idle');
    return;
  }
  connect();
}

/** Batch React cleanup/re-subscribe pairs into one socket reconfiguration. */
function scheduleReconfigure(): void {
  if (reconfigureQueued) return;
  reconfigureQueued = true;
  queueMicrotask(() => {
    reconfigureQueued = false;
    reconfigureNow();
  });
}

function subscribe(symbols: string[], listener: () => void): () => void {
  const id = nextSubscription++;
  subscriptions.set(id, new Set(symbols));
  listeners.add(listener);
  scheduleReconfigure();
  listener();
  return () => {
    subscriptions.delete(id);
    listeners.delete(listener);
    scheduleReconfigure();
  };
}

/**
 * @param opts.anySymbol stream any valid ticker. Binance silently omits pairs
 * it does not list; those rows keep their server-provided value.
 */
export function useLivePrices(symbols: string[], opts: { anySymbol?: boolean } = {}): Record<string, number> {
  const key = Array.from(new Set(symbols.map(streamSymbol)))
    .filter((symbol) => (opts.anySymbol ? /^[A-Z0-9]{2,12}$/.test(symbol) : SUPPORTED_SYMBOLS.has(symbol)))
    .sort()
    .join(',');
  const [state, setState] = useState<FeedSnapshot>(() => snapshot);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const requested = key ? key.split(',') : [];
    return subscribe(requested, () => setState(snapshot));
  }, [key]);

  // A stale socket tick must never override a newer server payload forever.
  useEffect(() => {
    if (!key) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [key]);

  return useMemo(() => {
    const out: Record<string, number> = {};
    for (const symbol of key ? key.split(',') : []) {
      const tick = state.prices[symbol];
      if (tick && priceFreshness(tick.updatedAt, now) === 'live') out[symbol] = tick.price;
    }
    // Also answer under retired symbols for saved records.
    for (const [old, current] of Object.entries(RENAMED_SYMBOLS)) if (out[current] != null) out[old] = out[current];
    return out;
  }, [key, now, state.prices]);
}
