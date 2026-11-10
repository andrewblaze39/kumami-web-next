'use client';

import Link from 'next/link';
import { useMarketEndpoint } from './useMarketEndpoint';
import { WIcon } from './console-ui';
import type { SpotPulsePayload, SpotPulseTile } from '@/lib/market/contracts';

function MiniTile({ t }: { t: SpotPulseTile }) {
  const textOn = t.verdict === 'BALANCED' ? 'var(--muted-2, var(--muted))' : '#07201b';
  return (
    <div
      className="w-sp-tile"
      title={`${t.asset} · ${t.verdict}`}
      style={{
        background: t.color,
        color: textOn,
        borderColor: t.glow ? '#5ee9a8' : 'transparent',
        boxShadow: t.glow ? '0 0 16px rgba(94,233,168,0.5)' : undefined,
      }}
    >
      <div className="w-sp-sym">{t.asset}</div>
      <div className="w-sp-verdict">{t.insufficient ? 'NO DATA' : t.notEnoughHistory ? 'NEW LISTING' : t.verdict}</div>
    </div>
  );
}

/** variant "pro" (Console Pro, v1.18): Market Pulse Pro's 10 coins in real time. */
export default function SpotPulsePreview({ variant = 'plus' }: { variant?: 'plus' | 'pro' }) {
  const pro = variant === 'pro';
  const market = useMarketEndpoint<SpotPulsePayload>(`/api/market/spot-pulse?tf=4H&view=${pro ? 'pro' : 'plus'}`);
  const data = market.data;
  const loading = market.status === 'loading' && !data;
  const shown = pro ? 10 : 5;

  return (
    <section className="w-apanel" aria-label="Market Pulse" data-tour="spotpulse">
      <div className="w-apanel-h">
        <span className="w-ttl">
          <span className="w-ic"><WIcon name="spark" /></span>
          {' '}{pro ? 'Market Pulse Pro' : 'Market Pulse'}{' '}
          <span
            className="w-oc-q"
            tabIndex={0}
            title="Where is real money moving? Each tile compares spot buying/selling (real capital) against futures (leverage) for that asset."
          >
            ?
          </span>{' '}
          <span className="w-sub">· real money vs leverage</span>
        </span>
        {pro ? (
          <span className="w-adv-updated"><span className="w-live-dot" /> Real-time</span>
        ) : (
          <Link href="/world/pro?tab=spotpulse" className="w-delay-note">
            Unlock Market Pulse Pro →
          </Link>
        )}
      </div>

      <div className="w-apanel-b">
        {loading ? (
          <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
        ) : !data || data.tiles.length === 0 ? (
          <p className="w-panel-empty">No Market Pulse data available.</p>
        ) : (
          <div className="w-sp-grid">
            {data.tiles.slice(0, shown).map((t) => (
              <MiniTile key={t.asset} t={t} />
            ))}
          </div>
        )}
      </div>

      <div className="w-apanel-foot">
        <span className="w-fmeta">{data ? data.marketVerdict : pro ? 'Spot vs. futures, 10 coins' : 'Spot vs. futures, five majors'}</span>
        <Link href={pro ? '/world/pro?tab=spotpulse' : '/world/onchain'}>
          Open {pro ? 'Market Pulse Pro' : 'Market Pulse'} <WIcon name="arrowR" />
        </Link>
      </div>
    </section>
  );
}
