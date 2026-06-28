'use client';

import { useCallback, useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import KumaBear from '../KumaBear';
import ScanLoading from './ScanLoading';
import ScanResults from './ScanResults';
import ScanFullReportModal from './ScanFullReportModal';
import { portfolioHash } from './portfolioHash';
import type { ScanRequestHolding, ScanResult, ScanStage } from './types';

interface PortfolioCoinLike {
  name: string;
  unitNum: number;
  value: number;
  change24h?: number;
  logo: string | null;
}

interface PortfolioScanCardProps {
  portfolio: PortfolioCoinLike[];
  totalValue: number;
  coinLogos: Record<string, string | undefined>;
}

interface CachedScan {
  result: ScanResult;
  portfolioHash: string;
  totalValueAtScan: number;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function PortfolioScanCard({ portfolio, totalValue, coinLogos }: PortfolioScanCardProps) {
  const { currentUser, userData } = useAuth();
  const [stage, setStage] = useState<ScanStage>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scannedHash, setScannedHash] = useState<string | null>(null);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached scan on mount
  useEffect(() => {
    const cached = (userData as { lastPortfolioScan?: CachedScan } | null)?.lastPortfolioScan;
    if (cached && cached.result) {
      setResult(cached.result);
      setScannedHash(cached.portfolioHash);
      setStage('results');
    }
  }, [userData]);

  // Keep currentHash in sync with portfolio
  useEffect(() => {
    let cancelled = false;
    portfolioHash(portfolio.map((p) => ({ symbol: p.name, amount: p.unitNum }))).then((h) => {
      if (!cancelled) setCurrentHash(h);
    });
    return () => {
      cancelled = true;
    };
  }, [portfolio]);

  const isStale = scannedHash !== null && currentHash !== null && scannedHash !== currentHash;

  const runScan = useCallback(async () => {
    if (stage === 'loading') return;
    if (portfolio.length === 0) return;

    setStage('loading');
    setError(null);

    const holdings: ScanRequestHolding[] = portfolio.map((p) => ({
      symbol: p.name,
      amount: p.unitNum,
      valueUsd: Number(p.value.toFixed(2)),
      allocationPct: totalValue > 0 ? Number(((p.value / totalValue) * 100).toFixed(2)) : 0,
      change24h: Number((p.change24h ?? 0).toFixed(2)),
    }));

    try {
      const res = await fetch('/api/portfolio-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.uid,
          currency: 'USD',
          totalValue,
          holdings,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Scan failed (${res.status})`);
      }

      const data = (await res.json()) as ScanResult;
      const hash = await portfolioHash(holdings.map((h) => ({ symbol: h.symbol, amount: h.amount })));

      setResult(data);
      setScannedHash(hash);
      setStage('results');

      if (currentUser) {
        const cached: CachedScan = {
          result: data,
          portfolioHash: hash,
          totalValueAtScan: totalValue,
        };
        updateDoc(doc(db, 'users', currentUser.uid), { lastPortfolioScan: cached }).catch((e) =>
          console.error('[scan] failed to cache scan', e)
        );
      }
    } catch (e) {
      console.error('[scan] error', e);
      setError(e instanceof Error ? e.message : 'Scan failed');
      setStage('error');
    }
  }, [stage, portfolio, totalValue, currentUser]);

  return (
    <>
      <div style={{ background: '#0c0d12', border: '1px solid rgba(150,237,214,0.18)', borderRadius: 16, overflow: 'hidden' }}>
        {isStale && stage === 'results' && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(250,204,21,0.08)',
              borderBottom: '1px solid rgba(250,204,21,0.22)',
              font: "600 11px 'Lato', system-ui, sans-serif",
              color: '#FACC15',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠ Portfolio changed since this scan — re-scan for fresh insight.</span>
          </div>
        )}

        {stage === 'idle' && <IdleState onScan={runScan} hasPortfolio={portfolio.length > 0} lastScanLabel={null} />}

        {stage === 'loading' && <ScanLoading holdingsCount={portfolio.length} />}

        {stage === 'results' && result && (
          <ScanResults result={result} onOpenReport={() => setModalOpen(true)} onRescan={runScan} />
        )}

        {stage === 'error' && (
          <ErrorState
            message={error || 'Kuma couldn’t finish the scan.'}
            onRetry={runScan}
            hasResult={!!result}
            onShowLast={() => setStage('results')}
          />
        )}
      </div>

      {result && (
        <ScanFullReportModal
          open={modalOpen}
          result={result}
          totalAssets={portfolio.length}
          totalValue={totalValue}
          coinLogos={coinLogos}
          onClose={() => setModalOpen(false)}
          onRescan={() => {
            setModalOpen(false);
            runScan();
          }}
        />
      )}
    </>
  );
}

function IdleState({
  onScan,
  hasPortfolio,
  lastScanLabel,
}: {
  onScan: () => void;
  hasPortfolio: boolean;
  lastScanLabel: string | null;
}) {
  return (
    <div style={{ padding: 20 }}>
      <style>{`
        @keyframes psSheen { 0%{transform:translateX(-130%)} 60%,100%{transform:translateX(260%)} }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span style={{ font: "900 10px 'Lato', system-ui, sans-serif", letterSpacing: '0.08em', color: '#96EDD6' }}>
          ⬡ AI PORTFOLIO SCAN
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 14,
          padding: 18,
          background: 'linear-gradient(120deg, rgba(150,237,214,0.14), rgba(167,139,250,0.12))',
          border: '1px solid rgba(150,237,214,0.28)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '35%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent)',
            animation: 'psSheen 3.6s ease-in-out infinite',
          }}
        />
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 6 }}>
          <KumaBear size={56} bob />
        </div>
        <div style={{ position: 'relative', font: "900 16px 'Lato', system-ui, sans-serif", color: '#fff', marginBottom: 4 }}>
          {hasPortfolio ? 'Let Kuma scan your bag' : 'Add assets to scan'}
        </div>
        <div style={{ position: 'relative', font: "400 12px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.65)', lineHeight: 1.45, marginBottom: 14 }}>
          {hasPortfolio
            ? 'Risk score · concentration · what to do next — about 5 seconds.'
            : 'Your portfolio is empty. Add a coin and Kuma will tell you what’s risky.'}
        </div>
        <button
          onClick={onScan}
          disabled={!hasPortfolio}
          style={{
            position: 'relative',
            width: '100%',
            background: hasPortfolio ? '#96EDD6' : 'rgba(150,237,214,0.3)',
            color: '#0a0a0f',
            font: "900 14px 'Lato', system-ui, sans-serif",
            padding: 12,
            border: 'none',
            borderRadius: 11,
            cursor: hasPortfolio ? 'pointer' : 'not-allowed',
            boxShadow: hasPortfolio ? '0 6px 18px rgba(150,237,214,0.28)' : 'none',
            opacity: hasPortfolio ? 1 : 0.6,
          }}
        >
          ⚡ Scan my portfolio
        </button>
      </div>
      <div style={{ textAlign: 'center', font: "600 11px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.35)', marginTop: 11 }}>
        Last scanned: {lastScanLabel ?? 'never'}
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
  hasResult,
  onShowLast,
}: {
  message: string;
  onRetry: () => void;
  hasResult: boolean;
  onShowLast: () => void;
}) {
  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <KumaBear size={48} bob={false} />
      <div style={{ font: "900 14px 'Lato', system-ui, sans-serif", color: '#fff', marginTop: 10 }}>
        Kuma couldn&apos;t finish the scan
      </div>
      <div style={{ font: "500 12px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.55)', marginTop: 4, marginBottom: 12 }}>
        {message}
      </div>
      <button
        onClick={onRetry}
        style={{
          background: '#96EDD6',
          color: '#0a0a0f',
          font: "900 13px 'Lato', system-ui, sans-serif",
          padding: '10px 18px',
          border: 'none',
          borderRadius: 11,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
      {hasResult && (
        <button
          onClick={onShowLast}
          style={{
            display: 'block',
            margin: '10px auto 0',
            background: 'none',
            border: 'none',
            color: '#96EDD6',
            font: "700 11px 'Lato', system-ui, sans-serif",
            cursor: 'pointer',
          }}
        >
          Show last scan
        </button>
      )}
    </div>
  );
}

// Keep IdleState compilation happy with the unused formatTime helper; export so it could be reused later.
export { formatTime };
