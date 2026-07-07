'use client';

/**
 * /world/watchlist — Watchlist page.
 *
 * Two sections:
 *   1. My Watchlist  — user-curated, stored in Firestore watchlists/{uid}
 *   2. Radar Watchlist — auto-detected top-4, read-only
 *
 * GET /api/market/watchlist returns:
 *   { slots: number|null, assets: WatchlistAsset[], curatedSymbols: string[], curatedAssets: WatchlistAsset[] }
 *
 * POST/DELETE /api/market/watchlist manages curated symbols server-side.
 *
 * Row format: price, 24h change, regime tag, ≤2 action-tag chips. No LLM text.
 */

import { useState, useCallback } from 'react';
import type { WatchlistApiResponse } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, formatChange, relativeTime } from '@/components/world/panels/format';
import Link from 'next/link';

// Convenience alias for the asset row shape
type WatchlistAsset = WatchlistApiResponse['assets'][number];

// ---------------------------------------------------------------------------
// Error-code → friendly message mapping (Issue #9)
// ---------------------------------------------------------------------------

function friendlyAddError(code: string, atLimit: boolean): string {
  if (code === 'slots_exceeded' || atLimit) {
    return 'Your watchlist is full. Upgrade to PRO for unlimited slots.';
  }
  if (code === 'invalid_symbol') {
    return "That asset isn't supported yet.";
  }
  if (code === 'Network error — please try again.') {
    return code; // already human-readable
  }
  return 'Something went wrong — please try again.';
}

// ---------------------------------------------------------------------------
// Allowed symbols (for Add dropdown — mirrors server allowlist)
// ---------------------------------------------------------------------------

const ALLOWED_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'DOGE', 'LINK', 'APT', 'SUI',
] as const;

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

const REGIME_CLASSES: Record<WatchlistAsset['regime'], string> = {
  'Trending Up':   'w-wl-regime w-wl-regime-up',
  'Trending Down': 'w-wl-regime w-wl-regime-down',
  'Coiling':       'w-wl-regime w-wl-regime-coil',
  'Ranging':       'w-wl-regime w-wl-regime-range',
};

const VERDICT_CLASSES: Record<string, string> = {
  green:      'w-verdict-green',
  'grey-green': 'w-verdict-grey-green',
  grey:       'w-verdict-grey',
  amber:      'w-verdict-amber',
  'grey-red': 'w-verdict-grey-red',
  red:        'w-verdict-red',
};

// ---------------------------------------------------------------------------
// Asset row
// ---------------------------------------------------------------------------

function AssetRow({ asset, onRemove }: { asset: WatchlistAsset; onRemove?: () => void }) {
  const changePos = asset.change24h >= 0;
  return (
    <div className="w-wl-row">
      <div className="w-wl-row-asset">
        <span className="w-wl-coin">{asset.asset.slice(0, 1)}</span>
        <span className="w-wl-symbol">{asset.asset}</span>
      </div>
      <div className="w-wl-row-price">
        <span className="w-wl-price">${formatPrice(asset.price)}</span>
        <span className={`w-wl-change${changePos ? ' pos' : ' neg'}`}>
          {formatChange(asset.change24h)}
        </span>
      </div>
      <div className="w-wl-row-tags">
        <span className={REGIME_CLASSES[asset.regime] ?? 'w-wl-regime'}>
          {asset.regime}
        </span>
        {asset.actionTags.slice(0, 2).map((tag, i) => (
          <span key={i} className={`w-wl-action-tag ${VERDICT_CLASSES[tag.color] ?? ''}`}>
            {tag.label}
          </span>
        ))}
      </div>
      {onRemove && (
        <button className="w-wl-remove" onClick={onRemove} aria-label={`Remove ${asset.asset}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="w-wl-row w-wl-row-skeleton" aria-hidden="true">
      <div className="w-wl-row-asset">
        <span className="w-skel" style={{ width: 28, height: 28, borderRadius: '50%' }} />
        <span className="w-skel" style={{ width: 48, height: 18, borderRadius: 4 }} />
      </div>
      <div className="w-wl-row-price">
        <span className="w-skel" style={{ width: 80, height: 18, borderRadius: 4 }} />
        <span className="w-skel" style={{ width: 52, height: 16, borderRadius: 4 }} />
      </div>
      <div className="w-wl-row-tags">
        <span className="w-skel" style={{ width: 90, height: 22, borderRadius: 6 }} />
        <span className="w-skel" style={{ width: 80, height: 22, borderRadius: 6 }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WatchlistPage() {
  const { currentUser, userData } = useAuth();
  const isPremium = userData?.isPremium === true;

  const endpoint = useMarketEndpoint<WatchlistApiResponse>('/api/market/watchlist');
  const data = endpoint.data;

  const [addSymbol, setAddSymbol] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);

  // Slots: null = unlimited
  const slots = data?.slots ?? null;
  const curatedSymbols = data?.curatedSymbols ?? [];
  const curatedCount = curatedSymbols.length;
  const atLimit = slots !== null && curatedCount >= slots;

  // Symbols not yet in the curated list (for Add dropdown)
  const availableToAdd = ALLOWED_SYMBOLS.filter(s => !curatedSymbols.includes(s));

  const getToken = useCallback(async () => {
    if (!currentUser) throw new Error('Not authenticated');
    return currentUser.getIdToken();
  }, [currentUser]);

  const handleAdd = async () => {
    if (!addSymbol || isAdding) return;
    setIsAdding(true);
    setAddError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/market/watchlist', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: addSymbol }),
      });
      if (res.status === 403) {
        setAddError('slots_exceeded');
      } else if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAddError((body as { error?: string }).error ?? 'unknown');
      } else {
        setAddSymbol('');
        endpoint.refetch();
      }
    } catch {
      setAddError('Network error — please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    if (removingSymbol) return;
    setRemovingSymbol(symbol);
    try {
      const token = await getToken();
      await fetch('/api/market/watchlist', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      endpoint.refetch();
    } catch {
      // silent — refetch will re-sync
    } finally {
      setRemovingSymbol(null);
    }
  };

  const isLoading = endpoint.status === 'loading';
  const hasError  = endpoint.status === 'error' && !endpoint.data;

  // Omit timestamp entirely — watchlist asset rows don't carry an updatedAt field
  // and fabricating new Date() would show "just now" on every render.

  return (
    <div className="w-content-inner w-watchlist">

      {/* ── Header ── */}
      <div className="w-watchlist-head">
        <div>
          <h1 className="w-page-title">Watchlist</h1>
          <p className="w-page-sub">Track your assets and smart-money signals.</p>
        </div>
      </div>

      {/* ── Error ── */}
      {hasError && (
        <div className="w-console-error" role="alert">
          <p className="w-console-error-msg">Unable to load watchlist. {endpoint.error}</p>
          <button className="w-btn w-btn-ghost w-btn-sm" onClick={endpoint.refetch}>Retry</button>
        </div>
      )}

      {/* ── Stale banner ── */}
      {endpoint.status === 'error' && endpoint.data && (
        <p className="w-console-stale-banner" role="status">
          Showing last available data — refresh failed.
        </p>
      )}

      {/* ════════════════════════════════════
          MY WATCHLIST
          ════════════════════════════════════ */}
      <section className="w-watchlist-section">
        <div className="w-watchlist-section-head">
          <h2 className="w-watchlist-section-title">My Watchlist</h2>
          {slots !== null && (
            <span className="w-watchlist-slot-count">
              {curatedCount} / {slots} slots
            </span>
          )}
        </div>

        {/* Add control */}
        <div className="w-wl-add-row">
          <select
            className="w-wl-add-select"
            value={addSymbol}
            onChange={e => { setAddSymbol(e.target.value); setAddError(null); }}
            aria-label="Select asset to add"
            disabled={isAdding || (atLimit && !isPremium)}
          >
            <option value="">Add asset…</option>
            {availableToAdd.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            className="w-btn w-btn-surface w-btn-sm"
            onClick={handleAdd}
            disabled={!addSymbol || isAdding || (atLimit && !isPremium)}
            aria-busy={isAdding}
          >
            {isAdding ? 'Adding…' : 'Add'}
          </button>
        </div>

        {/* Add error / upsell */}
        {addError && (
          <div className="w-wl-add-error" role="alert">
            <span>{friendlyAddError(addError, atLimit)}</span>
            {(addError === 'slots_exceeded' || atLimit) && !isPremium && (
              <Link href="/world/pro" className="w-wl-upsell-link">Unlock PRO</Link>
            )}
          </div>
        )}

        {/* Rows */}
        <div className="w-wl-list">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
          ) : curatedSymbols.length === 0 ? (
            <div className="w-wl-empty">
              <p>No assets yet — add your first asset above.</p>
            </div>
          ) : (
            data?.curatedAssets.map(asset => (
              <AssetRow
                key={asset.asset}
                asset={asset}
                onRemove={() => handleRemove(asset.asset)}
              />
            ))
          )}

          {/* Limit upsell row */}
          {!isLoading && !isPremium && atLimit && (
            <div className="w-wl-limit-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              </svg>
              <span>Free plan limit reached — </span>
              <Link href="/world/pro" className="w-wl-upsell-link">Unlock unlimited with PRO</Link>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════
          RADAR WATCHLIST
          ════════════════════════════════════ */}
      <section className="w-watchlist-section">
        <div className="w-watchlist-section-head">
          {/* Accessible text: "Radar Watchlist · auto-detected" (Issue #8) */}
          <h2 className="w-watchlist-section-title" aria-label="Radar Watchlist · auto-detected">
            Radar Watchlist
            <span className="w-watchlist-section-badge" aria-hidden="true">· auto-detected</span>
          </h2>
          <span className="w-watchlist-section-sub">Top assets by signal strength · read-only</span>
        </div>

        <div className="w-wl-list">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          ) : (data?.assets.length ?? 0) === 0 ? (
            <div className="w-wl-empty">
              <p>No radar assets available.</p>
            </div>
          ) : (
            data?.assets.map(asset => (
              <AssetRow key={asset.asset} asset={asset} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
