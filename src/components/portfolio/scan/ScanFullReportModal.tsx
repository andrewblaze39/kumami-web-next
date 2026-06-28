'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import KumaBear from '../KumaBear';
import { LEVEL_COLORS, DIMENSION_LABELS, LEVEL_TAG, type ScanResult } from './types';

interface ScanFullReportModalProps {
  open: boolean;
  result: ScanResult;
  totalAssets: number;
  totalValue: number;
  coinLogos: Record<string, string | undefined>;
  onClose: () => void;
  onRescan: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ScanFullReportModal({
  open,
  result,
  totalAssets,
  totalValue,
  coinLogos,
  onClose,
  onRescan,
}: ScanFullReportModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const levelColor = LEVEL_COLORS[result.overall.level];
  const ringOffset = 439.8 - (result.overall.score / 100) * 325.5;
  const ringStartColor = result.overall.level === 'low' ? '#4ade80' : '#FACC15';
  const ringEndColor = result.overall.level === 'high' ? '#f87171' : levelColor;

  return createPortal(
    <div className="ps-modal-wrap" style={{ position: 'fixed', inset: 0, zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <style>{`
        @keyframes psScrimIn { from{opacity:0} to{opacity:1} }
        @keyframes psModalIn { from{transform:translateY(18px) scale(.98)} to{transform:translateY(0) scale(1)} }
        @keyframes psGrowRing { from{stroke-dashoffset:439.8} to{stroke-dashoffset:var(--ring-end)} }

        @media (max-width: 640px) {
          .ps-modal-wrap { padding: 8px !important; align-items: flex-start !important; padding-top: 16px !important; }
          .ps-modal-card { padding: 18px !important; max-height: calc(100vh - 24px) !important; border-radius: 16px !important; }
          .ps-modal-hero { flex-direction: column !important; gap: 14px !important; padding: 14px !important; text-align: center; align-items: stretch !important; }
          .ps-modal-hero > div:first-child { margin: 0 auto !important; }
          .ps-modal-hero-text { text-align: center; }
          .ps-modal-ring { width: 120px !important; height: 120px !important; }
          .ps-modal-ring svg { width: 120px !important; height: 120px !important; }
          .ps-modal-ring .ps-score { font-size: 34px !important; }
          .ps-modal-asset-row { flex-wrap: wrap; gap: 8px !important; }
          .ps-modal-asset-row .ps-asset-note { flex-basis: 100%; order: 4; }
          .ps-modal-footer { flex-direction: column !important; }
          .ps-modal-footer button { width: 100% !important; }
        }
      `}</style>

      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5,6,9,0.86)',
          animation: 'psScrimIn .3s ease forwards',
          willChange: 'opacity',
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="ps-modal-card"
        style={{
          position: 'relative',
          width: 560,
          maxWidth: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#101218',
          border: '1px solid rgba(150,237,214,0.22)',
          borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
          padding: 26,
          animation: 'psModalIn .42s cubic-bezier(.34,1.2,.5,1) forwards',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <KumaBear size={34} bob={false} />
            <div>
              <div style={{ font: "900 17px 'Lato', system-ui, sans-serif", color: '#fff' }}>Portfolio Risk Report</div>
              <div style={{ font: "600 11px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.45)' }}>
                {totalAssets} asset{totalAssets === 1 ? '' : 's'} · ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} · {formatTime(result.scannedAt)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="ps-modal-hero"
          style={{
            display: 'flex',
            gap: 22,
            alignItems: 'center',
            padding: 18,
            borderRadius: 16,
            background: `radial-gradient(120% 120% at 50% 0%, ${levelColor}14, rgba(255,255,255,0.02))`,
            border: `1px solid ${levelColor}33`,
            marginBottom: 18,
          }}
        >
          <div className="ps-modal-ring" style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
            <svg viewBox="0 0 160 160" width={150} height={150} style={{ transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="psGring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={ringStartColor} />
                  <stop offset="1" stopColor={ringEndColor} />
                </linearGradient>
              </defs>
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="13" />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="url(#psGring)"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray="439.8"
                style={{
                  ['--ring-end' as string]: `${ringOffset}`,
                  animation: 'psGrowRing 1.2s cubic-bezier(.34,1.2,.5,1) forwards',
                } as React.CSSProperties}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="ps-score" style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", font: "800 42px 'Lato', system-ui, sans-serif", color: '#fff', lineHeight: 1 }}>
                {result.overall.score}
              </div>
              <div style={{ font: "700 8px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
                RISK SCORE
              </div>
            </div>
          </div>
          <div className="ps-modal-hero-text">
            <span
              style={{
                display: 'inline-block',
                font: "900 10px 'Lato', system-ui, sans-serif",
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '4px 11px',
                borderRadius: 999,
                background: `${levelColor}29`,
                color: levelColor,
                border: `1px solid ${levelColor}52`,
              }}
            >
              {result.overall.label}
            </span>
            <div style={{ font: "900 18px 'Lato', system-ui, sans-serif", color: '#fff', marginTop: 9, lineHeight: 1.25 }}>
              {result.overall.headline}
            </div>
          </div>
        </div>

        <div style={{ font: "900 10px 'Lato', system-ui, sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 9 }}>
          Risk breakdown
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 18 }}>
          {(['concentration', 'volatility', 'diversification', 'liquidity'] as const).map((key) => {
            const dim = result.dimensions.find((d) => d.key === key);
            const lvl = dim?.level ?? 'medium';
            const c = LEVEL_COLORS[lvl];
            return (
              <div
                key={key}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${c}40`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ font: "700 12px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.75)' }}>
                    {DIMENSION_LABELS[key]}
                  </span>
                  <span style={{ font: "900 9px 'Lato', system-ui, sans-serif", color: c }}>{LEVEL_TAG[lvl]}</span>
                </div>
                <div style={{ font: "900 15px 'Lato', system-ui, sans-serif", color: '#fff', marginTop: 4 }}>
                  {dim?.value ?? '—'}
                </div>
              </div>
            );
          })}
        </div>

        {result.assets.length > 0 && (
          <>
            <div style={{ font: "900 10px 'Lato', system-ui, sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 9 }}>
              Per-asset risk
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
              {result.assets.map((a) => {
                const c = LEVEL_COLORS[a.level];
                const logo = coinLogos[a.symbol];
                return (
                  <div
                    key={a.symbol}
                    className="ps-modal-asset-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      padding: '10px 13px',
                      borderRadius: 11,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {logo ? (
                      <img src={logo} alt={a.symbol} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(150,237,214,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "900 11px 'Lato', system-ui, sans-serif", color: '#96EDD6' }}>
                        {a.symbol[0]}
                      </div>
                    )}
                    <span style={{ font: "900 13px 'Lato', system-ui, sans-serif", color: '#fff', minWidth: 48 }}>{a.symbol}</span>
                    <span className="ps-asset-note" style={{ flex: 1, minWidth: 0, font: "500 11.5px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.6)' }}>{a.note}</span>
                    <span
                      style={{
                        font: "900 9px 'Lato', system-ui, sans-serif",
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: `${c}24`,
                        color: c,
                        border: `1px solid ${c}4D`,
                      }}
                    >
                      {LEVEL_TAG[a.level]}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {result.commentary && (
          <div style={{ display: 'flex', gap: 12, padding: 15, borderRadius: 14, background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.22)', marginBottom: 18 }}>
            <KumaBear size={38} bob={false} />
            <div style={{ font: "400 13.5px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>
              {result.commentary}
            </div>
          </div>
        )}

        {result.actions.length > 0 && (
          <>
            <div style={{ font: "900 10px 'Lato', system-ui, sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 9 }}>
              Suggested moves
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {result.actions.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    padding: '11px 13px',
                    borderRadius: 11,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span style={{ color: '#96EDD6', font: "900 13px 'Lato', system-ui, sans-serif" }}>{i + 1}</span>
                  <span style={{ font: "600 13px 'Lato', system-ui, sans-serif", color: '#dfe4ec', lineHeight: 1.4 }}>{a}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '11px 14px',
            borderRadius: 12,
            background: 'rgba(250,204,21,0.09)',
            border: '1px solid rgba(250,204,21,0.34)',
            marginBottom: 14,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ font: "900 14px 'Lato', system-ui, sans-serif", color: '#FACC15', lineHeight: 1.2 }}>⚠</span>
          <div style={{ font: "700 12px 'Lato', system-ui, sans-serif", color: '#FACC15', lineHeight: 1.45 }}>
            Kuma AI can make mistakes. This is educational risk analysis, not financial advice — always verify with your own research before making any moves.
          </div>
        </div>

        <div className="ps-modal-footer" style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: '#96EDD6',
              color: '#0a0a0f',
              font: "900 13px 'Lato', system-ui, sans-serif",
              padding: 12,
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
          <button
            onClick={onRescan}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: '#96EDD6',
              font: "800 13px 'Lato', system-ui, sans-serif",
              padding: '12px 16px',
              border: '1px solid rgba(150,237,214,0.3)',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            ↻ Re-scan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
