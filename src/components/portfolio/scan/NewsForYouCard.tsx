'use client';

import KumaBear from '../KumaBear';

interface NewsForYouCardProps {
  hasPortfolio: boolean;
}

export default function NewsForYouCard({ hasPortfolio }: NewsForYouCardProps) {
  return (
    <div style={{ background: '#0c0d12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
        <span style={{ font: "900 10px 'Lato', system-ui, sans-serif", letterSpacing: '0.08em', color: '#96EDD6' }}>
          📰 NEWS FOR YOUR BAG
        </span>
        <span style={{ font: "600 9px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.35)' }}>daily · 8AM</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          padding: '22px 12px',
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
        }}
      >
        <KumaBear size={42} bob />
        <div style={{ font: "700 12px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.65)' }}>
          {hasPortfolio ? 'Kuma is gathering news for your holdings…' : 'Add assets to see personalised news.'}
        </div>
        <div style={{ font: "500 11px 'Lato', system-ui, sans-serif", color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
          Daily picks coming soon — we&apos;ll surface market-moving stories filtered to the coins you hold.
        </div>
      </div>
    </div>
  );
}
