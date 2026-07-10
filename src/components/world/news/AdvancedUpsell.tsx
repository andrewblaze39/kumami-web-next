'use client';

import { TrendingUp, ArrowRight } from 'lucide-react';
import { useWorldMode } from '@/contexts/WorldModeContext';

/**
 * AdvancedUpsell — banner in the news portal nudging readers toward Advanced
 * mode. The CTA uses setMode('advanced') so the shell mode switches properly
 * (from /world/news this lands on /world/intel via the continuity logic).
 */
export default function AdvancedUpsell() {
  const { mode, setMode } = useWorldMode();

  // No point upselling users already in Advanced or Pro mode.
  if (mode !== 'beginner') return null;

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
          'linear-gradient(120deg, color-mix(in srgb, var(--gold) 10%, transparent) 0%, var(--panel-2) 55%)',
        border: '1px solid color-mix(in srgb, var(--gold) 28%, transparent)',
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
          background: 'linear-gradient(120deg, var(--gold), #f7e6a8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1a1405',
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
          Some stories go deeper.
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.55 }}>
          Articles tagged <span className="w-tag-badge w-tag-adv">Advanced</span> open the
          full on-chain analysis, regime read and Intelligence brief.
        </div>
      </div>

      <button
        onClick={() => setMode('advanced')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '10px 18px',
          borderRadius: '999px',
          background: 'linear-gradient(120deg, var(--gold), #f7e6a8)',
          border: 'none',
          color: '#1a1405',
          fontWeight: 800,
          fontSize: '12.5px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Open Advanced
        <ArrowRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
