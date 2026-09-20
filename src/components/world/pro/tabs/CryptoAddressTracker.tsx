'use client';

/**
 * Crypto Address Tracker (Kumami Pro §4) — paste any wallet address, get a
 * readable profile: portfolio value across chains, holdings, a behavioral
 * tag, and recent activity. Reuses the same Alchemy-backed data source as
 * Kuma AI Chat's basic wallet-watching room (/api/wallet-data), via a richer
 * dedicated endpoint (/api/wallet-profile) that doesn't touch that existing
 * feature's contract.
 *
 * Deferred (see /api/wallet-profile's header comment for why): realised
 * PnL/win rate, exchange-vs-cold-wallet labeling on activity, the
 * "consistent accumulator" flag, contract-risk flagging, the AI Read
 * narrative, and linked-wallet visualization.
 */

import { useState } from 'react';
import { Wallet, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProShellHead } from './shared';

type Holding = { symbol: string; amount: number; valueUsd: number | null; pctOfPortfolio: number | null };
type ActivityRow = {
  direction: 'in' | 'out';
  asset: string;
  value: number | null;
  counterparty: string | null;
  ts: string | null;
  hash: string;
};
type WalletProfile = {
  address: string;
  portfolioValueUsd: number;
  tag: 'Whale' | null;
  holdings: Holding[];
  stats: { transactions: number; firstSeen: string | null; realisedPnlUsd: null; winRatePct: null };
  recentActivity: ActivityRow[];
};

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function shortAddr(a: string | null): string {
  if (!a) return '—';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function CryptoAddressTracker() {
  const { currentUser } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<WalletProfile | null>(null);

  const handleLookup = async () => {
    const address = input.trim();
    if (!ADDRESS_RE.test(address)) {
      setError('Enter a valid EVM wallet address (0x…, 42 characters).');
      return;
    }
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/wallet-profile?address=${address}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Could not read that wallet — check the address and try again.');
      setProfile(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong reading that wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4" style={{ padding: '4px 2px' }}>
      <ProShellHead eyebrow="AI Tools" icon={<Wallet size={22} />} title="Crypto Address Tracker">
        Paste any wallet address to get a readable profile — no paid entity-labeling vendor
        required. Portfolio value, holdings and recent activity are live; behavioral
        classification is a work in progress.
      </ProShellHead>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }}
          placeholder="Paste an EVM wallet address (0x…)"
          style={{
            flex: 1, background: 'var(--adv-surface-2, #142a22)',
            border: '1px solid var(--adv-border, rgba(255,255,255,.1))',
            borderRadius: 10, padding: '10px 14px', color: 'var(--text, #f1f7f4)',
            fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={handleLookup}
          disabled={loading || !input.trim()}
          className="w-btn w-btn-pro w-btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
          {loading ? 'Reading…' : 'Look up'}
        </button>
      </div>
      {error && <p style={{ fontSize: 12.5, color: 'var(--bear)' }}>{error}</p>}

      {profile && (
        <>
          <div className="w-apanel" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
                  {profile.address}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
                  {formatUsd(profile.portfolioValueUsd)}
                  {profile.tag && (
                    <span
                      style={{
                        marginLeft: 10, fontSize: 12, fontWeight: 700, color: '#46e3a0',
                        border: '1px solid #46e3a0', borderRadius: 6, padding: '2px 8px', verticalAlign: 'middle',
                      }}
                    >
                      {profile.tag}
                    </span>
                  )}
                </div>
              </div>
              <a
                href={`https://etherscan.io/address/${profile.address}`}
                target="_blank"
                rel="noreferrer"
                className="w-btn w-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                Etherscan <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 18 }}>
              <Stat label="Portfolio Value" value={formatUsd(profile.portfolioValueUsd)} />
              <Stat label="Realised PnL" value="—" hint="Needs full trade-history reconstruction — not built yet" />
              <Stat label="Win Rate" value="—" hint="Needs full trade-history reconstruction — not built yet" />
              <Stat label="Transactions" value={String(profile.stats.transactions)} />
              <Stat
                label="First Seen"
                value={profile.stats.firstSeen ? new Date(profile.stats.firstSeen).toLocaleDateString() : '—'}
              />
            </div>
          </div>

          <div className="w-apanel" style={{ padding: 18 }}>
            <div className="w-apanel-h" style={{ padding: '0 0 12px', border: 'none' }}>
              <span className="w-ttl">Holdings</span>
            </div>
            {profile.holdings.filter((h) => h.amount > 0).length === 0 ? (
              <p className="w-panel-empty">No holdings found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.holdings.filter((h) => h.amount > 0).map((h) => (
                  <div key={h.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ fontWeight: 700 }}>{h.symbol}</span>
                    <span style={{ color: 'var(--muted)' }}>{h.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                    <span style={{ fontWeight: 700 }}>
                      {h.valueUsd != null ? formatUsd(h.valueUsd) : '— (unpriced)'}
                    </span>
                    <span style={{ color: 'var(--muted)', width: 50, textAlign: 'right' }}>
                      {h.pctOfPortfolio != null ? `${h.pctOfPortfolio.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-apanel" style={{ padding: 18 }}>
            <div className="w-apanel-h" style={{ padding: '0 0 12px', border: 'none' }}>
              <span className="w-ttl">Recent activity</span>
              <span className="w-sub">Ethereum mainnet, last {profile.recentActivity.length}</span>
            </div>
            {profile.recentActivity.length === 0 ? (
              <p className="w-panel-empty">No recent activity found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.recentActivity.map((a) => (
                  <div key={a.hash} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span className={a.direction === 'in' ? 'w-bull' : 'w-bear'} style={{ fontWeight: 700, width: 70 }}>
                      {a.direction === 'in' ? '↓ In' : '↑ Out'}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>
                      {a.value != null ? a.value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'} {a.asset}
                    </span>
                    <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{shortAddr(a.counterparty)}</span>
                    <a
                      href={`https://etherscan.io/tx/${a.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent)' }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}
