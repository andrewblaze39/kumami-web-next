'use client';

/**
 * /world/intel/[id] — Intelligence brief detail view.
 *
 * The brief ID comes from IntelligencePayload.briefs[].id (string, set by
 * the mock fixture as e.g. "intel-a1-<hourSeed>"). The full payload is
 * fetched from /api/market/intelligence and the brief is found by id.
 *
 * Design note: if the id is not found in the current payload (e.g. data
 * rotated between sessions) we show a "brief not found" state with a back
 * link. We do NOT invent contract changes.
 */

import Link from 'next/link';
import { use } from 'react';
import type { IntelligencePayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { useAuth } from '@/contexts/AuthContext';
import { relativeTime, formatTime } from '@/components/world/panels/format';

const TIER_LABELS: Record<string, string> = { A: 'Tier A', B: 'Tier B', C: 'Tier C' };
const TIER_CLASSES: Record<string, string> = {
  A: 'w-intel-tier w-intel-tier-a',
  B: 'w-intel-tier w-intel-tier-b',
  C: 'w-intel-tier w-intel-tier-c',
};

function BackLink() {
  return (
    <Link href="/world/intel" className="w-intel-back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Back to Intelligence
    </Link>
  );
}

function ProLockedBlock() {
  return (
    <div className="w-intel-pro-locked w-intel-detail-pro-locked" aria-label="PRO interpretation — locked">
      <div className="w-intel-pro-blur-wrap" aria-hidden="true">
        <div className="w-intel-pro-blur-line" />
        <div className="w-intel-pro-blur-line" />
        <div className="w-intel-pro-blur-line w-intel-pro-blur-line-short" />
      </div>
      <div className="w-intel-pro-gate">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </svg>
        <span>PRO interpretation is locked for this brief.</span>
        <Link href="/world/pro" className="w-intel-pro-cta">Unlock PRO</Link>
      </div>
    </div>
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function IntelDetailPage({ params }: Props) {
  const { id } = use(params);
  const { userData } = useAuth();
  const isPremium = userData?.isPremium === true;

  const intel = useMarketEndpoint<IntelligencePayload>('/api/market/intelligence');
  const brief = intel.data?.briefs.find(b => b.id === id);

  const isLoading = intel.status === 'loading';
  const hasError = intel.status === 'error' && !intel.data;

  // Loading state
  if (isLoading) {
    return (
      <div className="w-content-inner w-intel-detail">
        <BackLink />
        <div className="w-intel-detail-card">
          <div className="w-intel-detail-head">
            <span className="w-skel" style={{ width: 64, height: 22, borderRadius: 6 }} />
            <span className="w-skel" style={{ width: 90, height: 18, borderRadius: 5 }} />
          </div>
          <div className="w-skel" style={{ width: '80%', height: 28, borderRadius: 6, marginTop: 16 }} />
          <div className="w-skel" style={{ width: '100%', height: 16, borderRadius: 4, marginTop: 14 }} />
          <div className="w-skel" style={{ width: '92%', height: 16, borderRadius: 4, marginTop: 8 }} />
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="w-content-inner w-intel-detail">
        <BackLink />
        <div className="w-console-error" role="alert">
          <p className="w-console-error-msg">Unable to load intelligence feed. {intel.error}</p>
          <button className="w-btn w-btn-ghost w-btn-sm" onClick={intel.refetch}>Retry</button>
        </div>
      </div>
    );
  }

  // Not found (data loaded but id missing — may have rotated between sessions)
  if (intel.data && !brief) {
    return (
      <div className="w-content-inner w-intel-detail">
        <BackLink />
        <div className="w-intel-not-found">
          <p>This brief is no longer available in the current feed.</p>
          <Link href="/world/intel" className="w-btn w-btn-ghost w-btn-sm">View all briefs</Link>
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const showProContent = isPremium && brief.proInterpretation;
  const showLockedShell = !isPremium && brief.tier === 'A';

  return (
    <div className="w-content-inner w-intel-detail">
      <BackLink />

      <article className="w-intel-detail-card">
        {/* Header row */}
        <div className="w-intel-detail-head">
          <span className={TIER_CLASSES[brief.tier] ?? 'w-intel-tier w-intel-tier-c'}>
            {TIER_LABELS[brief.tier] ?? brief.tier}
          </span>
          <span className="w-intel-category-tag">{brief.category}</span>
        </div>

        {/* Title */}
        <h1 className="w-intel-detail-title">{brief.headline}</h1>

        {/* Meta */}
        <div className="w-intel-detail-meta">
          <span className="w-intel-source">{brief.source}</span>
          <span className="w-intel-ts" title={formatTime(brief.ts)}>
            {relativeTime(brief.ts)}
          </span>
          {brief.assets.length > 0 && (
            <div className="w-intel-assets">
              {brief.assets.map(a => (
                <span key={a} className="w-intel-asset-chip">{a}</span>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="w-intel-detail-body">
          <p className="w-intel-detail-summary">{brief.summary}</p>
        </div>

        {/* PRO section */}
        {(showProContent || showLockedShell) && (
          <div className="w-intel-detail-pro-section">
            <div className="w-intel-detail-pro-heading">
              <span className="w-intel-pro-label">PRO</span>
              <span className="w-intel-detail-pro-title">Market Interpretation</span>
            </div>
            {showProContent ? (
              <p className="w-intel-detail-pro-body">{brief.proInterpretation}</p>
            ) : (
              <ProLockedBlock />
            )}
          </div>
        )}
      </article>
    </div>
  );
}
