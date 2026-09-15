'use client';

/**
 * Paste an EVM wallet address, scan its live ETH + top-5 ERC-20 holdings via
 * the existing Alchemy-backed /api/wallet-data route (same endpoint Kuma AI's
 * Crypto Address Tracker uses), and let the user pick which to add to their
 * Portfolio. Prices resolve against the caller's already-loaded CoinGecko
 * top-100 map — tokens outside that list can't be priced and are skipped.
 */

import { useState } from 'react';
import { X, Wallet, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MarketPriceEntry {
  price: number;
  change24h: number;
  image: string;
  id: string;
}

export interface ImportedHolding {
  symbol: string;
  amount: number;
  price: number;
  coinId: string | null;
  logo: string | null;
}

interface DetectedHolding extends Omit<ImportedHolding, 'price' | 'coinId' | 'logo'> {
  price: number | null;
  coinId: string | null;
  logo: string | null;
}

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketPrices: Record<string, MarketPriceEntry>;
  onImport: (holdings: ImportedHolding[]) => Promise<void>;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export default function ImportWalletModal({ isOpen, onClose, marketPrices, onImport }: ImportWalletModalProps) {
  const { currentUser } = useAuth();
  const [address, setAddress] = useState('');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<DetectedHolding[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setAddress('');
    setStep('input');
    setError(null);
    setHoldings([]);
    setSkippedCount(0);
    setSelected(new Set());
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleScan = async () => {
    const trimmed = address.trim();
    if (!ADDRESS_RE.test(trimmed)) {
      setError('Enter a valid EVM wallet address (0x…, 42 characters).');
      return;
    }
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/wallet-data?address=${trimmed}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Could not read that wallet — check the address and try again.');
      const data: {
        summary: { chain: string; ethBalance: string }[];
        holdings: { symbol: string; balance: string }[];
      } = await res.json();

      const candidates: { symbol: string; amount: number }[] = [];
      const ethRow = data.summary.find((s) => s.chain === 'eth');
      if (ethRow) {
        const amount = parseFloat(ethRow.ethBalance);
        if (amount > 0) candidates.push({ symbol: 'ETH', amount });
      }
      for (const h of data.holdings) {
        const amount = parseFloat(h.balance);
        if (amount > 0) candidates.push({ symbol: h.symbol.toUpperCase(), amount });
      }

      const resolved: DetectedHolding[] = [];
      let skipped = 0;
      for (const c of candidates) {
        const market = marketPrices[c.symbol];
        if (market) {
          resolved.push({ symbol: c.symbol, amount: c.amount, price: market.price, coinId: market.id, logo: market.image });
        } else {
          skipped += 1;
        }
      }

      if (resolved.length === 0) {
        setError(
          skipped > 0
            ? `Found ${skipped} token${skipped === 1 ? '' : 's'} in this wallet, but couldn't price any of them (only top-100 coins are supported today).`
            : 'No holdings found in this wallet.',
        );
        setLoading(false);
        return;
      }

      setHoldings(resolved);
      setSkippedCount(skipped);
      setSelected(new Set(resolved.map((r) => r.symbol)));
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong reading that wallet.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (symbol: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const handleImport = async () => {
    const toImport = holdings.filter(
      (h): h is DetectedHolding & { price: number } => selected.has(h.symbol) && h.price !== null,
    );
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      await onImport(toImport.map((h) => ({ symbol: h.symbol, amount: h.amount, price: h.price, coinId: h.coinId, logo: h.logo })));
      handleClose();
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="relative px-6 py-5 rounded-2xl shadow-2xl w-full overflow-hidden"
        style={{
          background: '#0a0a0f',
          backgroundImage: 'radial-gradient(circle, rgba(150,237,214,0.06) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          border: '1px solid rgba(150,237,214,0.18)',
          backdropFilter: 'blur(12px)',
          maxWidth: 'min(28rem, 90vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[#96EDD6]/20"
          style={{ color: '#96EDD6', background: 'rgba(150,237,214,0.08)' }}
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5" style={{ color: '#96EDD6' }} />
          <h2 className="text-xl font-black text-white tracking-tight">Import Wallet</h2>
        </div>

        {step === 'input' && (
          <div className="flex flex-col gap-3 pt-4">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Paste an EVM wallet address — we&apos;ll read its live ETH and token balances and let
              you pick which ones to add.
            </p>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x…"
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(150,237,214,0.18)',
                color: '#fff',
                outline: 'none',
              }}
            />
            {error && (
              <p className="text-xs" style={{ color: '#f87171' }}>
                {error}
              </p>
            )}
            <button
              onClick={handleScan}
              disabled={loading || !address.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold disabled:opacity-50"
              style={{ background: '#96EDD6', color: '#0a0a0f', padding: '10px 12px', fontSize: 14 }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Scanning wallet…' : 'Scan wallet'}
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-3 pt-4">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Found {holdings.length} holding{holdings.length === 1 ? '' : 's'}
              {skippedCount > 0
                ? ` (${skippedCount} unrecognized token${skippedCount === 1 ? '' : 's'} skipped)`
                : ''}
              . Pick which to add:
            </p>
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {holdings.map((h) => (
                <label
                  key={h.symbol}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.has(h.symbol)} onChange={() => toggle(h.symbol)} />
                    <span className="text-sm font-semibold text-white">{h.symbol}</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {h.amount.toFixed(4)}
                    </span>
                  </span>
                  <span className="text-xs font-mono" style={{ color: '#96EDD6' }}>
                    ${((h.price ?? 0) * h.amount).toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStep('input')}
                className="flex-1 rounded-xl font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '10px 12px', fontSize: 14 }}
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="flex-1 rounded-xl font-semibold disabled:opacity-50"
                style={{ background: '#96EDD6', color: '#0a0a0f', padding: '10px 12px', fontSize: 14 }}
              >
                {importing ? 'Adding…' : `Add ${selected.size} asset${selected.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
