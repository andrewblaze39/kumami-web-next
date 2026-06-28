'use client';

import { LEVEL_COLORS, DIMENSION_LABELS, type ScanResult } from './types';

interface ScanResultsProps {
  result: ScanResult;
  onOpenReport: () => void;
  onRescan: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ScanResults({ result, onOpenReport, onRescan }: ScanResultsProps) {
  const levelColor = LEVEL_COLORS[result.overall.level];
  // sort dimensions worst-first
  const worstFirst = [...result.dimensions].sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    return rank[a.level] - rank[b.level];
  });
  const topThree = worstFirst.slice(0, 3);

  // Map score 0–100 to needle rotation: -92deg → 43deg (total 135deg)
  const needleAngle = -92 + (result.overall.score / 100) * 135;
  // Gauge arc: full length 251.3, animate from 251.3 to (251.3 - score% * 186)
  const arcOffset = 251.3 - (result.overall.score / 100) * 186;

  return (
    <div style={{ padding: 20, animation: 'psFadeUp .5s ease forwards' }}>
      <style>{`
        @keyframes psFadeUp { from{transform:translateY(12px)} to{transform:translateY(0)} }
        @keyframes psGrowArc { from{stroke-dashoffset:251.3} to{stroke-dashoffset:var(--arc-end)} }
        @keyframes psNeedleSwing { from{transform:rotate(-92deg)} to{transform:rotate(var(--needle-end))} }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ font: "900 10px 'Lato', system-ui, sans-serif", letterSpacing: '0.08em', color: '#96EDD6' }}>
          ⬡ AI RISK READ
        </span>
        <span style={{ font: "600 10px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.4)' }}>just now</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 200 110" width={150} height={86}>
            <defs>
              <linearGradient id="psGv" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#4ade80" />
                <stop offset="0.5" stopColor="#FACC15" />
                <stop offset="1" stopColor="#f87171" />
              </linearGradient>
            </defs>
            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#psGv)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="251.3"
              style={{
                ['--arc-end' as string]: `${arcOffset}`,
                animation: 'psGrowArc 1.1s cubic-bezier(.34,1.3,.5,1) forwards',
              } as React.CSSProperties}
            />
            <g
              style={{
                transformOrigin: '100px 100px',
                ['--needle-end' as string]: `${needleAngle}deg`,
                animation: 'psNeedleSwing 1.1s cubic-bezier(.34,1.4,.5,1) forwards',
              } as React.CSSProperties}
            >
              <line x1="100" y1="100" x2="100" y2="34" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="100" cy="100" r="6" fill="#fff" />
            </g>
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
            <span style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", font: "800 22px 'Lato', system-ui, sans-serif", color: levelColor, lineHeight: 1 }}>
              {result.overall.score}
            </span>
            <span style={{ font: "700 9px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.4)' }}>/ 100</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
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
          <div style={{ font: "900 14px 'Lato', system-ui, sans-serif", color: '#fff', marginTop: 8, lineHeight: 1.3 }}>
            {result.overall.headline}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
        {topThree.map((d) => {
          const c = LEVEL_COLORS[d.level];
          return (
            <div
              key={d.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${c}38`,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}` }} />
              <span style={{ flex: 1, font: "700 12px 'Lato', system-ui, sans-serif", color: '#fff' }}>
                {DIMENSION_LABELS[d.key]}
              </span>
              <span style={{ font: "600 11px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.55)' }}>
                {d.value}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onOpenReport}
        style={{
          width: '100%',
          background: '#96EDD6',
          color: '#0a0a0f',
          font: "900 13px 'Lato', system-ui, sans-serif",
          padding: 12,
          border: 'none',
          borderRadius: 11,
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(150,237,214,0.25)',
        }}
      >
        View full report ›
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 }}>
        <span style={{ font: "600 11px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.4)' }}>
          Scanned {formatTime(result.scannedAt)}
        </span>
        <button
          onClick={onRescan}
          style={{
            background: 'none',
            border: 'none',
            color: '#96EDD6',
            font: "800 11px 'Lato', system-ui, sans-serif",
            cursor: 'pointer',
          }}
        >
          ↻ Re-scan
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: '8px 11px',
          borderRadius: 9,
          background: 'rgba(250,204,21,0.08)',
          border: '1px solid rgba(250,204,21,0.32)',
          font: "700 10.5px 'Lato', system-ui, sans-serif",
          color: '#FACC15',
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        ⚠ Kuma AI can make mistakes. Always verify — not financial advice.
      </div>
    </div>
  );
}
