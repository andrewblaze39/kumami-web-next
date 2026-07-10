'use client';

import Link from 'next/link';
import type { ConsolePayload } from '@/lib/market/contracts';
import { relativeTime } from './format';
import { WIcon, catTagStyle, intelGrad } from './console-ui';

type Props = {
  briefs: ConsolePayload['intelPreview'];
  loading?: boolean;
};

const TIER_LABEL: Record<'A' | 'B' | 'C', string> = {
  A: 'Tier A — high-impact, time-sensitive',
  B: 'Tier B — notable developments',
  C: 'Tier C — informational',
};

export default function IntelPreview({ briefs, loading }: Props) {
  return (
    <section className="w-apanel" aria-label="Intelligence">
      <div className="w-apanel-h">
        <span className="w-ttl">
          <span className="w-ic"><WIcon name="doc" /></span>
          {' '}Intelligence{' '}
          <span
            className="w-oc-q"
            tabIndex={0}
            title="Today’s news, ranked by impact: A moves the market, B is worth knowing, C is context. Filter by topic or the coins you hold."
          >
            ?
          </span>{' '}
          <span className="w-sub">· Daily Brief</span>
        </span>
        <span className="w-sub">Finance · Crypto · AI</span>
      </div>

      {loading ? (
        <div className="w-apanel-b">
          <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
        </div>
      ) : briefs.length === 0 ? (
        <div className="w-apanel-b">
          <p className="w-panel-empty">No intelligence briefs available at this time.</p>
        </div>
      ) : (
        <div className="w-intel-list" aria-label="Intelligence headlines">
          {briefs.slice(0, 4).map((brief, i) => (
            <div key={i} className="w-intel-item">
              <span className="w-ii-thumb" style={{ background: intelGrad(brief.category) }}>
                <span
                  className={`w-tier w-tier-${brief.tier}`}
                  title={TIER_LABEL[brief.tier]}
                  aria-label={TIER_LABEL[brief.tier]}
                >
                  {brief.tier}
                </span>
              </span>
              <div className="w-intel-main">
                <div className="w-ih">{brief.headline}</div>
                <div className="w-intel-meta">
                  <span
                    className="w-cat-tag"
                    style={catTagStyle(brief.category)}
                    title={`Category: ${brief.category}`}
                  >
                    {brief.category}
                  </span>
                  <span title={`Source: ${brief.source}`}>{brief.source}</span>
                  <span className="w-dot-sep" />
                  <span>{relativeTime(brief.ts)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="w-apanel-foot">
        <span className="w-fmeta">{briefs.length} briefs today</span>
        <Link href="/world/intel">
          Open Intelligence <WIcon name="arrowR" />
        </Link>
      </div>
    </section>
  );
}
