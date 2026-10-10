'use client';

/**
 * Watchlist — one component, two versions (Andrew's spec v1.6):
 *   variant="plus" → Watchlist Plus (/world/watchlist, every account): the 5
 *     fixed coins (BTC/ETH/SOL/BNB/HYPE) with Signal + Status, no adding.
 *   variant="pro"  → Watchlist Pro (/world/pro?tab=watchlist, Pro accounts):
 *     the 5 fixed coins + your own coins (up to 15) + 5 extra coins that were
 *     most consistent in Flow Radar over 7 days (24h scoring while history builds).
 * The server enforces the version via ?view= (Pro data needs a Pro account).
 */

import { useEffect, useState } from 'react';
import { WIcon, CoinBadge } from '@/components/world/panels/console-ui';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { formatPrice, formatChange, verdictColorClass } from '@/components/world/panels/format';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProductTour, { type TourStep } from '@/components/world/ProductTour';
import type { Verdict, WatchlistApiResponse } from '@/lib/market/contracts';

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
    selector: '[data-tour="wl-sections"]',
    title: 'Your Watchlist + Also Worth Watching',
    body: "Pro adds two more sections below: pin up to 15 tokens of your own, and \"Also Worth Watching\" — assets Flow Radar flags as significant that you haven't added yet, refreshed every 5 minutes.",
  },
  {
    selector: '[data-tour="wl-alerts"]',
    title: 'Alerts are a Pro upgrade',
    body: 'Get an in-app alert the moment a tracked asset crosses your threshold — all part of Pro.',
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
  /** Signal column — dedicated whale/smart-money/Spot Pulse narrative. */
  signal: WatchlistApiResponse['assets'][number]['primarySignal'];
  /** Status column — up to 2 risk/positioning/regime tags, independent of Signal. */
  statusTags: Verdict[];
  reasons?: string[];
};

/** Map the live payload assets into display rows. */
function toRows(assets: WatchlistApiResponse['assets']): WatchRow[] {
  return assets.map((a) => {
    const dir: 'up' | 'down' = a.change24h >= 0 ? 'up' : 'down';
    return {
      sym: a.asset,
      name: COIN_NAME[a.asset] ?? a.asset,
      price: `$${formatPrice(a.price)}`,
      chg: formatChange(a.change24h),
      dir,
      signal: a.primarySignal,
      statusTags: a.actionTags,
    };
  });
}

/** Same as toRows, but carries Section C's per-asset "why this" reasons. */
function toSectionCRows(assets: WatchlistApiResponse['sectionC']): WatchRow[] {
  return toRows(assets).map((row, i) => ({ ...row, reasons: assets[i].reasons }));
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export type ToolVariant = 'plus' | 'pro';

export default function WatchlistView({ variant }: { variant: ToolVariant }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  // "Pro" here means the Pro VERSION of the tool (Watchlist Pro), not the account.
  const isPremium = variant === 'pro';
  const market = useMarketEndpoint<WatchlistApiResponse>(`/api/market/watchlist?view=${variant}`);
  const bw = market.data ? toRows(market.data.assets) : [];
  const pinnedRows = market.data ? toRows(market.data.curatedAssets) : [];
  const sectionCRows = market.data ? toSectionCRows(market.data.sectionC) : [];
  const pinCap = market.data?.pinCap ?? null;
  const pinnedCount = market.data?.curatedSymbols.length ?? 0;
  // Safety net: if the fetch is somehow still unresolved after 12s (a hung
  // upstream, not just a slow one), stop showing a skeleton forever and fall
  // through to the "No data" + Retry state instead.
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    if (market.status !== 'loading') return;
    const t = setTimeout(() => setLoadingTimedOut(true), 12_000);
    return () => clearTimeout(t);
  }, [market.status]);
  const loading = market.status === 'loading' && !loadingTimedOut;
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
      const res = await fetch('/api/market/watchlist?view=pro', {
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
        <div className="w-ptag">{isPremium ? 'Watchlist Pro' : 'Watchlist Plus'}</div>
        <h1>
          <WIcon name="bookmark" /> {isPremium ? 'Watchlist Pro' : 'Watchlist Plus'}
        </h1>
        {isPremium ? (
          <p>
            The 5 market anchors, <b style={{ color: 'var(--accent)' }}>your own coins</b> (up to 15), and the
            coins that keep showing up in Flow Radar — with live flow signals and positioning tags.
          </p>
        ) : (
          <p>
            Track <b style={{ color: 'var(--accent)' }}>BTC, ETH, SOL, BNB, and HYPE</b> with live
            flow signals and positioning tags — updated every minute. Adding your own coins and the
            coins Flow Radar keeps flagging are part of <b style={{ color: 'var(--purple)' }}>Watchlist Pro</b>.
          </p>
        )}
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
          <span>Signal</span>
          <span className="w-status-col">Status</span>
        </div>
        {loading && (
          <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" style={{ margin: '14px 20px' }} />
        )}
        {!loading && bw.length === 0 && (
          <div className="w-wl-trow" role="status">
            <div className="w-wl-asset w-muted" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              No data
              <button type="button" className="w-btn w-btn-ghost w-btn-sm" onClick={market.refetch}>Retry</button>
            </div>
            <div /><div /><div /><div />
          </div>
        )}
        {bw.map(w => (
          <div key={w.sym} className="w-wl-trow">
            <div className="w-wl-asset">
              <CoinBadge sym={w.sym} />
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
            <div className="w-wl-signal">
              <span className={`w-wl-signal-lbl ${verdictColorClass(w.signal.color)}`}>
                {w.signal.icon} {w.signal.label}
              </span>
              <span className="w-wl-signal-detail">{w.signal.detail}</span>
            </div>
            <div className="w-wl-acts w-status-col">
              {w.statusTags.length === 0 ? (
                <span className="w-wl-status-empty">—</span>
              ) : (
                w.statusTags.map((tag, i) => (
                  <span key={i} className={`w-tag-chip ${verdictColorClass(tag.color)}`}>
                    {tag.label}
                  </span>
                ))
              )}
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
              onClick={() => router.push('/world/pro?tab=watchlist')}
            >
              <WIcon name="bolt" /> Open Watchlist Pro
            </button>
          </div>
        )}
      </div>

      {/* ── Section B — Your Watchlist (Pro capability) ── */}
      {isPremium && (
        <div className="w-wl-table" data-tour="wl-sections" style={{ marginTop: 16 }}>
          <div className="w-wl-flowbar">
            <WIcon name="bookmark" />
            <span>Your Watchlist</span>
            <span className="w-wl-auto" style={{ marginLeft: 'auto' }}>
              {pinCap !== null ? `${pinnedCount}/${pinCap} assets tracked` : 'Pro'}
            </span>
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
              <button
                className="w-btn w-btn-pro w-btn-sm"
                onClick={addPin}
                disabled={pinBusy || (pinCap !== null && pinnedCount >= pinCap)}
              >
                <WIcon name="spark" /> Pin
              </button>
            </div>
            {pinError && <span style={{ fontSize: 12, color: 'var(--bear)' }}>{pinError}</span>}
          </div>
          {pinnedCount === 0 ? (
            <div className="w-wl-trow">
              <div className="w-wl-asset w-muted">
                Build your custom watchlist — add up to {pinCap ?? 15} tokens or wallets.
              </div>
              <div /><div /><div /><div />
            </div>
          ) : (
            pinnedRows.map((w) => (
              <div key={w.sym} className="w-wl-trow">
                <div className="w-wl-asset">
                  <CoinBadge sym={w.sym} />
                  <span><b>{w.sym}</b><span>{w.name}</span></span>
                  {/* Phones hide the Status column (and its Remove button) — this one shows there instead. */}
                  <button
                    type="button"
                    className="w-wl-remove-mobile"
                    aria-label={`Remove ${w.sym}`}
                    onClick={() => removePin(w.sym)}
                    disabled={pinBusy}
                  >
                    ×
                  </button>
                </div>
                <div>
                  <b style={{ fontWeight: 800 }}>{w.price}</b>
                </div>
                <div className="w-c-24h">
                  <span className={w.dir === 'up' ? 'w-bull' : 'w-bear'} style={{ fontWeight: 800 }}>
                    {w.chg}
                  </span>
                </div>
                <div className="w-wl-signal">
                  <span className={`w-wl-signal-lbl ${verdictColorClass(w.signal.color)}`}>
                    {w.signal.icon} {w.signal.label}
                  </span>
                  <span className="w-wl-signal-detail">{w.signal.detail}</span>
                </div>
                <div className="w-wl-acts w-status-col">
                  {w.statusTags.map((tag, i) => (
                    <span key={i} className={`w-tag-chip ${verdictColorClass(tag.color)}`}>{tag.label}</span>
                  ))}
                  <button className="w-btn w-btn-sm" onClick={() => removePin(w.sym)} disabled={pinBusy}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Section C — Also Worth Watching (Pro, auto-detected) ── */}
      {isPremium && sectionCRows.length > 0 && (
        <div className="w-wl-table" style={{ marginTop: 16 }}>
          <div className="w-wl-flowbar">
            <WIcon name="flame" />
            <span>Also Worth Watching</span>
            <span className="w-wl-auto" style={{ marginLeft: 'auto' }}>
              {market.data?.sectionCMode === 'consistent'
                ? 'Most consistent in Flow Radar · last 7 days'
                : `Last 24h · building 7-day history (${market.data?.historyDays ?? 0}/7 days)`}
            </span>
          </div>
          {sectionCRows.map((w) => (
            <div key={w.sym} className="w-wl-trow">
              <div className="w-wl-asset">
                <CoinBadge sym={w.sym} />
                <span><b>◆ {w.sym}</b><span>{w.name}</span></span>
              </div>
              <div>
                <b style={{ fontWeight: 800 }}>{w.price}</b>
              </div>
              <div className="w-c-24h">
                <span className={w.dir === 'up' ? 'w-bull' : 'w-bear'} style={{ fontWeight: 800 }}>
                  {w.chg}
                </span>
              </div>
              <div className="w-wl-signal" title={w.reasons?.join(' · ')}>
                <span className={`w-wl-signal-lbl ${verdictColorClass(w.signal.color)}`}>
                  🔥 {w.reasons?.[0] ?? w.signal.label}
                </span>
                <span className="w-wl-signal-detail">{w.reasons?.[1] ?? w.signal.detail}</span>
              </div>
              <div className="w-wl-acts w-status-col">
                {w.statusTags.length === 0 ? (
                  <span className="w-wl-status-empty">—</span>
                ) : (
                  w.statusTags.map((tag, i) => (
                    <span key={i} className={`w-tag-chip ${verdictColorClass(tag.color)}`}>{tag.label}</span>
                  ))
                )}
              </div>
            </div>
          ))}
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
