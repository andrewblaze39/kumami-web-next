'use client';

import Link from 'next/link';
import type { ConsolePayload } from '@/lib/market/contracts';
import { relativeTime } from './format';

type Props = {
  briefs: ConsolePayload['intelPreview'];
  updatedAt: string;
  loading?: boolean;
};

const TIER_CLASS: Record<'A' | 'B' | 'C', string> = {
  A: 'w-tier-a',
  B: 'w-tier-b',
  C: 'w-tier-c',
};

const TIER_LABEL: Record<'A' | 'B' | 'C', string> = {
  A: 'Tier A — high-impact, time-sensitive',
  B: 'Tier B — notable developments',
  C: 'Tier C — informational',
};

export default function IntelPreview({ briefs, updatedAt, loading }: Props) {
  return (
    <section className="w-panel w-panel-intel" aria-label="Intelligence Preview">
      <div className="w-panel-header">
        <span className="w-panel-eyebrow">Intelligence</span>
        <time className="w-panel-ts" dateTime={updatedAt} title={updatedAt}>
          {relativeTime(updatedAt)}
        </time>
      </div>

      {loading ? (
        <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
      ) : briefs.length === 0 ? (
        <p className="w-panel-empty">No intelligence briefs available at this time.</p>
      ) : (
        <ul className="w-intel-list" aria-label="Intelligence headlines">
          {briefs.map((brief, i) => (
            <li key={i} className="w-intel-brief">
              <div className="w-intel-brief-header">
                <span
                  className={`w-intel-tier ${TIER_CLASS[brief.tier]}`}
                  title={TIER_LABEL[brief.tier]}
                  aria-label={TIER_LABEL[brief.tier]}
                >
                  {brief.tier}
                </span>
                <span
                  className="w-intel-category"
                  title={`Category: ${brief.category}`}
                >
                  {brief.category}
                </span>
                <time
                  className="w-panel-ts"
                  dateTime={brief.ts}
                  title={brief.ts}
                >
                  {relativeTime(brief.ts)}
                </time>
              </div>
              <p className="w-intel-headline">{brief.headline}</p>
              <span className="w-intel-source" title={`Source: ${brief.source}`}>
                {brief.source}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="w-panel-footer">
        <Link href="/world/intel" className="w-panel-footer-link">
          View all intelligence →
        </Link>
      </div>
    </section>
  );
}
