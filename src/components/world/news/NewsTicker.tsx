'use client';

/**
 * NewsTicker — compact marquee price strip for the World news portal.
 *
 * Price sourcing is extracted from the legacy `src/components/CryptoTicker.tsx`:
 * a WebSocket to the Kumami Cloudflare worker (`tickerworker.kumamiworldapp.workers.dev`)
 * which proxies Binance `@ticker` streams. Live push updates (no polling interval);
 * auto-reconnects 1s after a dropped connection.
 */

import { useEffect, useRef, useState } from 'react';

const COINS = [
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'XRP',
  'KAIA',
  'PENGU',
  'SUI',
  'DOGE',
  'POL',
] as const;

type CoinSymbol = (typeof COINS)[number];

interface Quote {
  price: number | null;
  change: number | null;
}

const WS_ENDPOINT = 'wss://tickerworker.kumamiworldapp.workers.dev/';
const STREAMS = COINS.map((c) => `${c.toLowerCase()}usdt@ticker`);
const RECONNECT_DELAY_MS = 1000;

const EMPTY_QUOTES: Record<CoinSymbol, Quote> = Object.fromEntries(
  COINS.map((c) => [c, { price: null, change: null }])
) as Record<CoinSymbol, Quote>;

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  if (price > 1) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function formatChange(change: number | null): string {
  if (change === null) return '—';
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}

export default function NewsTicker() {
  const [quotes, setQuotes] = useState<Record<CoinSymbol, Quote>>(EMPTY_QUOTES);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      socketRef.current?.close();

      const socket = new WebSocket(WS_ENDPOINT);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({ method: 'SUBSCRIBE', params: STREAMS, id: 1 })
        );
      };

      socket.onmessage = (event) => {
        try {
          const { data } = JSON.parse(event.data);
          if (!data) return;
          const symbol = (data.s || '').replace('USDT', '') as CoinSymbol;
          if (!COINS.includes(symbol) || !data.c || !data.P) return;
          const price = parseFloat(data.c);
          const change = parseFloat(data.P);
          setQuotes((prev) => ({ ...prev, [symbol]: { price, change } }));
        } catch {
          // Non-ticker frames are expected — ignore.
        }
      };

      socket.onclose = () => {
        if (disposed || socketRef.current !== socket) return;
        setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      disposed = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const renderSequence = (copy: number) => (
    <div className="w-tk-seq" aria-hidden={copy > 0} key={copy}>
      {COINS.map((symbol) => {
        const q = quotes[symbol];
        const dir =
          q.change === null ? '' : q.change >= 0 ? 'up' : 'down';
        return (
          <span className="w-tk-item" key={`${copy}-${symbol}`}>
            {symbol} <b>${formatPrice(q.price)}</b>{' '}
            <span className={dir}>{formatChange(q.change)}</span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="w-np-ticker">
      <span className="w-tk-label">MARKETS</span>
      <div className="w-tk-track">
        <div className="w-tk-move">
          {renderSequence(0)}
          {renderSequence(1)}
        </div>
      </div>
    </div>
  );
}
