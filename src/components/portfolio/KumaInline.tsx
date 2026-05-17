// src/components/portfolio/KumaInline.tsx
'use client';

import { useState } from 'react';
import KumaBear from './KumaBear';
import { KUMA_PHASES, type KumaPhase } from './kuma-phases';

interface KumaInlineProps {
  phase?: KumaPhase;
}

export default function KumaInline({ phase = 1 }: KumaInlineProps) {
  const [idx, setIdx] = useState(0);
  const meta = KUMA_PHASES[phase];
  const messages = meta.messages.length > 0 ? meta.messages : KUMA_PHASES[1].messages;
  const text = messages[idx % messages.length];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${meta.color}55`,
        borderRadius: 14,
        minWidth: 0,
        maxWidth: 360,
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <KumaBear size={64} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: meta.color,
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: meta.color,
              boxShadow: `0 0 8px ${meta.color}`,
              flexShrink: 0,
            }}
          />
          KUMA AI · {meta.tag}
        </div>
        {/* Message */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.4,
            color: '#fff',
          }}
        >
          {text}
        </div>
        {/* Next tip button */}
        <button
          onClick={() => setIdx((i) => i + 1)}
          style={{
            marginTop: 6,
            padding: '3px 8px',
            background: 'transparent',
            border: 'none',
            color: meta.color,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            borderRadius: 4,
          }}
        >
          NEXT TIP ›
        </button>
      </div>
    </div>
  );
}
