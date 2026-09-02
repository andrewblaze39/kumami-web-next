'use client';

import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { ProShellHead } from './shared';

/**
 * ComingSoon — placeholder panel for Pro tabs whose live data source is still
 * being wired (Smart Money, Coin/Token Tracker, Liquidation Heatmap, Security
 * Scanner, Fear & Greed). Renders the standard panel header plus a branded
 * "coming soon" card describing what the tab will do and its planned source.
 */
export function ComingSoon({
  eyebrow,
  icon,
  title,
  description,
}: {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <>
      <ProShellHead eyebrow={eyebrow} icon={icon} title={title}>
        {description}
      </ProShellHead>
      <div
        className="apanel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 12,
          padding: '48px 24px',
        }}
      >
        <span
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--pro-soft)',
            color: 'var(--pro)',
          }}
        >
          <Sparkles size={24} />
        </span>
        <span className="oc-tag" style={{ background: 'var(--pro-soft)', color: 'var(--pro)' }}>
          Coming soon
        </span>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
        <p style={{ margin: 0, maxWidth: '52ch', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </>
  );
}
