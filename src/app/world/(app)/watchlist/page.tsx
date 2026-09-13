'use client';

/**
 * /world/watchlist — Watchlist page.
 *
 * Live: consumes /api/market/watchlist (WatchlistApiResponse). The table is a
 * fixed curated symbol list (capped to tier slots), each row flagged by the
 * watchlist-tags engine (funding-rate/long-short crowding) or its regime —
 * NOT a bullish-flow ranking (that ranking is a separate engine used only on
 * the Console's "Auto-Watchlist" preview panel). Falls back to a clean
 * loading/empty state. UI shell unchanged from the port.
 */

import { useEffect, useState } from 'react';
import { WIcon, coinC } from '@/components/world/panels/console-ui';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { formatPrice, formatChange } from '@/components/world/panels/format';
import { useWorldMode } from '@/contexts/WorldModeContext';
import { useAuth } from '@/contexts/AuthContext';
import ProductTour, { type TourStep } from '@/components/world/ProductTour';
import type { WatchlistApiResponse } from '@/lib/market/contracts';

const WATCHLIST_TOUR: TourStep[] = [
  {
    title: 'Your auto-watchlist 👋',
    body: 'No setup needed — a curated list of major assets, always on. Quick tour? Leave anytime.',
  },
  {
    selector: '[data-tour="wl-flowbar"]',
    title: 'Curated majors, live',
    body: 'A fixed set of major assets, refreshed continuously — price, movement and positioning, so you always have a baseline view without building one yourself.',
  },
  {
    selector: '[data-tour="wl-table"]',
    title: 'Price, move & flow signal',
    body: 'Each row shows the live price, 24h move, and the single most notable signal on that asset right now — crowded positioning, funding stress, or its current trend regime.',
  },
  {
    selector: '[data-tour="wl-alerts"]',
    title: 'Alerts are a Pro upgrade',
    body: 'Pin your own tokens, set a custom order, and get an in-app alert the moment a tracked asset crosses your threshold — all part of Pro.',
  },
  {
    title: "That's your Watchlist 🎉",
    body: 'Replay anytime with the "Take a tour" button. Explore the other tools from the sidebar.',
  },
];

const COIN_NAME: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  GOLD: 'Gold (RWA)',
  LINK: 'Chainlink',
  BNB: 'BNB Chain',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  AVAX: 'Avalanche',
  ADA: 'Cardano',
  SUI: 'Sui',
  HYPE: 'Hyperliquid',
};

type WatchRow = {
  sym: string;
  name: string;
  price: string;
  chg: string;
  dir: 'up' | 'down';
  signal: string;
};

/** Map the live payload assets into display rows. */
function toRows(assets: WatchlistApiResponse['assets']): WatchRow[] {
  return assets.map((a) => {
    const dir: 'up' | 'down' = a.change24h >= 0 ? 'up' : 'down';
    const signal = a.actionTags[0]?.label ?? a.regime;
    return {
      sym: a.asset,
      name: COIN_NAME[a.asset] ?? a.asset,
      price: `$${formatPrice(a.price)}`,
      chg: formatChange(a.change24h),
      dir,
      signal,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function WatchlistPage() {
  const { setMode } = useWorldMode();
  const { userData, currentUser } = useAuth();
  // Pro users (or admins) can pin their own tokens; everyone gets the auto list.
  const isPremium =
    userData?.isPremium === true || userData?.role === 'admin' || userData?.role === 'superadmin';
  const market = useMarketEndpoint<WatchlistApiResponse>('/api/market/watchlist');
  const bw = market.data ? toRows(market.data.assets) : [];
  const pinnedRows = market.data ? toRows(market.data.curatedAssets) : [];
  const loading = market.status === 'loading';
  const [tourOpen, setTourOpen] = useState(false);

  const [pin, setPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const callWatchlist = async (method: 'POST' | 'DELETE', symbol: string) => {
    if (!currentUser) return;
    setPinBusy(true);
    setPinError(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/market/watchlist', {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setPinError(
          body?.error === 'slots_exceeded'
            ? 'Your watchlist is full.'
            : body?.error === 'invalid_symbol'
            ? `"${symbol}" isn't a supported ticker yet.`
            : 'Something went wrong — try again.',
        );
        return;
      }
      market.refetch();
    } catch {
      setPinError('Something went wrong — try again.');
    } finally {
      setPinBusy(false);
    }
  };

  const addPin = () => {
    const symbol = pin.trim().toUpperCase();
    if (!symbol) return;
    setPin('');
    void callWatchlist('POST', symbol);
  };

  const removePin = (symbol: string) => void callWatchlist('DELETE', symbol);

  // Auto-open once for first-time visitors.
  useEffect(() => {
    try {
      if (!localStorage.getItem('kumami_tour_watchlist_seen')) {
        const t = setTimeout(() => setTourOpen(true), 700);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage unavailable — skip auto-open */ }
  }, []);

  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem('kumami_tour_watchlist_seen', '1'); } catch { /* ignore */ }
  };

  return (
    <div className="w-content-inner w-watchlist">
      {/* ── Page head ── */}
      <div className="w-page-head">
        <div className="w-ptag">Watchlist</div>
        <h1>
          <WIcon name="bookmark" /> Watchlist
        </h1>
        <p>
          A live table of <b style={{ color: 'var(--accent)' }}>curated major assets</b> — price,
          24h move, and a flag when funding or long/short positioning gets crowded. Building your
          own custom list, price alerts and notes is part of{' '}
          <b style={{ color: 'var(--purple)' }}>Pro</b>.
        </p>
        <button type="button" className="w-tour-trigger" onClick={() => setTourOpen(true)} style={{ marginTop: 10 }}>
          <WIcon name="spark" /> Take a tour
        </button>
      </div>

      {/* ── Flow bar ── */}
      <div className="w-wl-flowbar" data-tour="wl-flowbar">
        <WIcon name="flame" />
        <span>Curated majors · price, positioning &amp; regime, live</span>
        <span className="w-wl-auto">Auto</span>
      </div>

      {/* ── Table ── */}
      <div className="w-wl-table" data-tour="wl-table">
        <div className="w-wl-thead">
          <span>Asset</span>
          <span>Price</span>
          <span className="w-h-24h">24h</span>
          <span className="w-sig-col">Flow signal</span>
        </div>
        {loading && (
          <div className="w-wl-trow" role="status">
            <div className="w-wl-asset w-muted">Loading live watchlist…</div>
            <div /><div /><div />
          </div>
        )}
        {!loading && bw.length === 0 && (
          <div className="w-wl-trow" role="status">
            <div className="w-wl-asset w-muted">Couldn&apos;t load the watchlist right now.</div>
            <div /><div /><div />
          </div>
        )}
        {bw.map(w => (
          <div key={w.sym} className="w-wl-trow">
            <div className="w-wl-asset">
              <span className="w-coin" style={{ background: coinC(w.sym) }}>
                {w.sym[0]}
              </span>
              <span>
                <b>{w.sym}</b>
                <span>{w.name}</span>
              </span>
            </div>
            <div>
              <b style={{ fontWeight: 800 }}>{w.price}</b>
            </div>
            <div className="w-c-24h">
              <span className={w.dir === 'up' ? 'w-bull' : 'w-bear'} style={{ fontWeight: 800 }}>
                {w.chg}
              </span>
            </div>
            <div className="w-wl-acts">
              <span className="w-wl-sig">
                <WIcon name="flame" /> {w.signal}
              </span>
            </div>
          </div>
        ))}
        {!isPremium && (
          <div className="w-wl-cap">
            <span className="w-lk-sm">
              <WIcon name="lock" />
            </span>
            <span>
              Custom watchlists are a <b style={{ color: 'var(--purple)' }}>Pro</b> feature — pin any
              token or wallet and set your own order.
            </span>
            <button
              className="w-btn w-btn-pro w-btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setMode('pro')}
            >
              <WIcon name="bolt" /> Customize with Pro
            </button>
          </div>
        )}
      </div>

      {/* ── Your pinned tokens (Pro capability) ── */}
      {isPremium && (
        <div className="w-wl-table" style={{ marginTop: 16 }}>
          <div className="w-wl-flowbar">
            <WIcon name="bookmark" />
            <span>Your pinned tokens</span>
            <span className="w-wl-auto" style={{ marginLeft: 'auto' }}>Pro</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 16px', borderBottom: '1px solid var(--adv-border, rgba(255,255,255,.08))' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={pin}
                onChange={(e) => { setPin(e.target.value.toUpperCase()); setPinError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') addPin(); }}
                placeholder="Add a ticker (e.g. BTC)"
                style={{ flex: 1, background: 'var(--adv-surface-2, #142a22)', border: '1px solid var(--adv-border, rgba(255,255,255,.1))', borderRadius: 10, padding: '8px 12px', color: 'var(--text, #f1f7f4)', fontSize: 13, outline: 'none' }}
              />
              <button className="w-btn w-btn-pro w-btn-sm" onClick={addPin} disabled={pinBusy}>
                <WIcon name="spark" /> Pin
              </button>
            </div>
            {pinError && <span style={{ fontSize: 12, color: 'var(--bear)' }}>{pinError}</span>}
          </div>
          {(market.data?.curatedSymbols.length ?? 0) === 0 ? (
            <div className="w-wl-trow"><div className="w-wl-asset w-muted">No pinned tokens yet — add one above.</div><div /><div /><div /></div>
          ) : (
            pinnedRows.map((w) => (
              <div key={w.sym} className="w-wl-trow">
                <div className="w-wl-asset">
                  <span className="w-coin" style={{ background: coinC(w.sym) }}>{w.sym[0]}</span>
                  <span><b>{w.sym}</b><span>{w.name}</span></span>
                </div>
                <div>
                  <b style={{ fontWeight: 800 }}>{w.price}</b>
                </div>
                <div className="w-c-24h">
                  <span className={w.dir === 'up' ? 'w-bull' : 'w-bear'} style={{ fontWeight: 800 }}>
                    {w.chg}
                  </span>
                </div>
                <div className="w-wl-acts">
                  <button className="w-btn w-btn-sm" onClick={() => removePin(w.sym)} disabled={pinBusy}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Alerts panel — locked for Plus, links to Following & Alerts for Pro ── */}
      {isPremium ? (
        <div className="w-apanel" data-tour="wl-alerts" style={{ marginTop: 16, padding: 20 }}>
          <div className="w-apanel-h" style={{ padding: '0 0 12px', border: 'none' }}>
            <span className="w-ttl">
              <span className="w-ic"><WIcon name="shield" /></span> Price &amp; whale alerts
            </span>
          </div>
          <p className="w-muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
            Set live alerts on any asset — they fire the moment the price moves past your threshold.
          </p>
          <a className="w-btn w-btn-pro w-btn-sm" href="/world/pro?tab=followhub">
            <WIcon name="bolt" /> Open Following &amp; Alerts
          </a>
        </div>
      ) : (
        <div className="w-apanel w-locked" data-tour="wl-alerts" style={{ marginTop: 16, minHeight: 120 }}>
          <div className="w-lock-blur" style={{ padding: 20 }}>
            <div className="w-apanel-h" style={{ padding: '0 0 14px', border: 'none' }}>
              <span className="w-ttl">
                <span className="w-ic">
                  <WIcon name="shield" />
                </span>{' '}
                Price &amp; whale alerts
              </span>
            </div>
            <p className="w-muted" style={{ fontSize: 13, margin: 0 }}>
              Get an in-app alert the moment a tracked asset crosses your price threshold.
            </p>
          </div>
          <div className="w-lock-veil">
            <span className="w-lk">
              <WIcon name="lock" />
            </span>
            <b>Alerts are a Pro feature</b>
            <span>Real-time alerts on major market moves</span>
          </div>
        </div>
      )}

      {tourOpen && <ProductTour steps={WATCHLIST_TOUR} onClose={closeTour} />}
    </div>
  );
}
