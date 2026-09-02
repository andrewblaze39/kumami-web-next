'use client';

import { useState } from 'react';
import { Bookmark, Plus, X } from 'lucide-react';
import { useProState } from '../ProState';
import { ProShellHead } from './shared';

const COIN_NAME: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB Chain', XRP: 'XRP',
  DOGE: 'Dogecoin', AVAX: 'Avalanche', LINK: 'Chainlink', ADA: 'Cardano',
  MATIC: 'Polygon', DOT: 'Polkadot', ARB: 'Arbitrum', OP: 'Optimism',
};

/**
 * Watchlist — the tickers a user chooses to track, persisted per-user via
 * ProState (Firestore). Live prices, changes and smart-money auto-curation
 * depend on the market-data integration, so price fields read "—" until that
 * external feed is wired in (no placeholder numbers).
 */
export function Watchlist() {
  const { ready, watchManual, addWatch, removeWatch } = useProState();
  const [input, setInput] = useState('');

  const submit = () => { addWatch(input); setInput(''); };

  return (
    <>
      <ProShellHead eyebrow="Tools" icon={<Bookmark size={24} />} title="Watchlist">
        The assets you want to keep an eye on. Add any ticker and it stays on your list across devices.
      </ProShellHead>

      <div className="pro-toolbar">
        <div className="pro-search">
          <Plus size={15} />
          <input
            placeholder="Add a ticker (e.g. BTC)…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
        </div>
        <button className="btn btn-pro btn-sm" onClick={submit} disabled={!ready}><Plus size={14} /> Add</button>
      </div>

      <div className="wl-table" style={{ overflow: 'hidden' }}>
        {!ready ? (
          <div className="oc-empty" style={{ padding: '40px 20px' }}>Loading your watchlist…</div>
        ) : watchManual.length === 0 ? (
          <div className="oc-empty" style={{ padding: '40px 20px' }}>
            <Bookmark size={26} />
            Your watchlist is empty — add a ticker above to start tracking it.
          </div>
        ) : (
          watchManual.map((sym) => (
            <div className="wl-item" key={sym}>
              <span className="wl-coin" style={{ background: 'var(--adv-surface-3)', color: 'var(--text)' }}>{sym.charAt(0)}</span>
              <div className="wl-main">
                <b>{sym}</b>
                <span>{COIN_NAME[sym] || 'Added by you'}</span>
              </div>
              <div className="wl-price">
                <b style={{ color: 'var(--muted-2)' }}>—</b>
                <span style={{ color: 'var(--muted-2)' }}>price soon</span>
              </div>
              <button className="followbtn" style={{ padding: '5px 9px' }} onClick={() => removeWatch(sym)} aria-label={`Remove ${sym}`}>
                <X size={13} />
              </button>
            </div>
          ))
        )}
        <div className="wl-cap">
          <Bookmark size={16} /> Live prices, % changes and smart-money auto-curation arrive with the
          market-data integration.
        </div>
      </div>
    </>
  );
}
