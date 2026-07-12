'use client';

import { TrendingUp, ArrowRight } from 'lucide-react';
import { useWorldMode } from '@/contexts/WorldModeContext';

/**
 * AdvancedUpsell — banner in the news portal nudging readers toward Pro
 * mode. The CTA uses setMode('pro') so the shell mode switches properly.
 */
export default function AdvancedUpsell() {
  const { mode, setMode } = useWorldMode();

  // No point upselling users already in Pro mode.
  if (mode === 'pro') return null;

  return (
    <div
      style={{
        marginTop: '28px',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '18px 22px',
        borderRadius: '16px',
        background:
          'linear-gradient(120deg, color-mix(in srgb, var(--pro-accent, #a855f7) 10%, transparent) 0%, var(--panel-2) 55%)',
        border: '1px solid color-mix(in srgb, var(--pro-accent, #a855f7) 28%, transparent)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          flexShrink: 0,
          background: 'linear-gradient(120deg, var(--pro-accent, #a855f7), #c084fc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        <TrendingUp size={19} strokeWidth={2.2} />
      </div>

      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div
          style={{
            fontSize: '14.5px',
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: 'var(--ink)',
            marginBottom: '3px',
          }}
        >
          Get more insights &amp; full analysis on Pro
        </div>
      </div>

      <button
        onClick={() => setMode('pro')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '10px 18px',
          borderRadius: '999px',
          background: 'linear-gradient(120deg, var(--pro-accent, #a855f7), #c084fc)',
          border: 'none',
          color: '#fff',
          fontWeight: 800,
          fontSize: '12.5px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Open Pro
        <ArrowRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
