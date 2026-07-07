'use client';

/**
 * /world/intel — Intelligence feed page.
 *
 * Fetches IntelligencePayload from GET /api/market/intelligence.
 * Supports client-side filtering by category + asset.
 *
 * PRO layer:
 *   - Free tier: server strips proInterpretation. Tier-A briefs render a
 *     blurred locked block with placeholder lines (content never sent).
 *   - Pro tier: full proInterpretation text rendered beneath the summary.
 *
 * Macro-calendar and token-unlock items arrive as regular brief rows with
 * their own category values (e.g. "Macro", "Protocol") — rendered normally.
 */

import Link from 'next/link';
import { useState, useMemo } from 'react';
import type { IntelligencePayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { useAuth } from '@/contexts/AuthContext';
import { relativeTime } from '@/components/world/panels/format';

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------

const TIER_LABELS: Record<string, string> = { A: 'Tier A', B: 'Tier B', C: 'Tier C' };
const TIER_CLASSES: Record<string, string> = {
  A: 'w-intel-tier w-intel-tier-a',
  B: 'w-intel-tier w-intel-tier-b',
  C: 'w-intel-tier w-intel-tier-c',
};

// ---------------------------------------------------------------------------
// Category chips
// ---------------------------------------------------------------------------

const CATEGORY_CHIPS = ['All', 'Regulatory', 'Trade', 'Narrative', 'Macro'];

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="w-intel-row w-intel-row-skeleton" aria-hidden="true">
      <div className="w-intel-row-head">
        <span className="w-skel" style={{ width: 56, height: 20, borderRadius: 6 }} />
        <span className="w-skel" style={{ width: 80, height: 20, borderRadius: 6 }} />
        <span className="w-skel" style={{ width: 90, height: 16, borderRadius: 4 }} />
      </div>
      <span className="w-skel" style={{ width: '70%', height: 20, borderRadius: 5 }} />
      <span className="w-skel" style={{ width: '90%', height: 16, borderRadius: 4 }} />
      <span className="w-skel" style={{ width: '80%', height: 16, borderRadius: 4 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PRO locked block (free user + tier-A brief)
// ---------------------------------------------------------------------------

function ProLockedBlock() {
  return (
    <div className="w-intel-pro-locked" aria-label="PRO interpretation — locked">
      <div className="w-intel-pro-blur-wrap" aria-hidden="true">
        <div className="w-intel-pro-blur-line" />
        <div className="w-intel-pro-blur-line w-intel-pro-blur-line-short" />
      </div>
      <div className="w-intel-pro-gate">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </svg>
        <span>Unlock PRO interpretation</span>
        <Link href="/world/pro" className="w-intel-pro-cta">Go PRO</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brief row
// ---------------------------------------------------------------------------

type Brief = IntelligencePayload['briefs'][number];

function BriefRow({ brief, isPremium }: { brief: Brief; isPremium: boolean }) {
  const showProContent = isPremium && brief.proInterpretation;
  const showLockedShell = !isPremium && brief.tier === 'A';

  return (
    <Link href={`/world/intel/${brief.id}`} className="w-intel-row" aria-label={brief.headline}>
      <div className="w-intel-row-head">
        <span className={TIER_CLASSES[brief.tier] ?? 'w-intel-tier w-intel-tier-c'}>
          {TIER_LABELS[brief.tier] ?? brief.tier}
        </span>
        <span className="w-intel-category-tag">{brief.category}</span>
        <span className="w-intel-ts">{relativeTime(brief.ts)}</span>
      </div>

      <h3 className="w-intel-headline">{brief.headline}</h3>
      <p className="w-intel-summary">{brief.summary}</p>

      <div className="w-intel-row-foot">
        <span className="w-intel-source">{brief.source}</span>
        {brief.assets.length > 0 && (
          <div className="w-intel-assets">
            {brief.assets.slice(0, 4).map(a => (
              <span key={a} className="w-intel-asset-chip">{a}</span>
            ))}
          </div>
        )}
      </div>

      {showProContent && (
        <div className="w-intel-pro-content">
          <span className="w-intel-pro-label">PRO</span>
          <p className="w-intel-pro-text">{brief.proInterpretation}</p>
        </div>
      )}

      {showLockedShell && <ProLockedBlock />}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IntelPage() {
  const { userData } = useAuth();
  const isPremium = userData?.isPremium === true;

  const intel = useMarketEndpoint<IntelligencePayload>('/api/market/intelligence');
  const briefs = intel.data?.briefs ?? [];

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [assetFilter, setAssetFilter] = useState('All');

  // Derive asset options from the payload
  const assetOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const b of briefs) {
      for (const a of b.assets) seen.add(a);
    }
    return ['All', ...Array.from(seen).sort()];
  }, [briefs]);

  // Client-side filter
  const filtered = useMemo(() => {
    return briefs.filter(b => {
      const catOk = categoryFilter === 'All' || b.category === categoryFilter;
      const assetOk = assetFilter === 'All' || b.assets.includes(assetFilter);
      return catOk && assetOk;
    });
  }, [briefs, categoryFilter, assetFilter]);

  const isLoading = intel.status === 'loading';
  const hasError = intel.status === 'error' && !intel.data;

  return (
    <div className="w-content-inner w-intel-page">

      {/* ── Header ── */}
      <div className="w-intel-head">
        <div>
          <h1 className="w-page-title">Intelligence</h1>
          <p className="w-page-sub">Curated, tiered briefs from macro, protocol, and flow events.</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="w-intel-filters">
        <div className="w-intel-filter-group" role="group" aria-label="Filter by category">
          {CATEGORY_CHIPS.map(cat => (
            <button
              key={cat}
              className={`w-intel-filter-chip${categoryFilter === cat ? ' on' : ''}`}
              onClick={() => setCategoryFilter(cat)}
              aria-pressed={categoryFilter === cat}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Asset filter */}
        <div className="w-intel-filter-asset">
          <label htmlFor="intel-asset-filter" className="w-intel-filter-label">Asset</label>
          <select
            id="intel-asset-filter"
            className="w-intel-asset-select"
            value={assetFilter}
            onChange={e => setAssetFilter(e.target.value)}
          >
            {assetOptions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Stale banner ── */}
      {intel.status === 'error' && intel.data && (
        <p className="w-console-stale-banner" role="status">
          Showing last available data — refresh failed. Will retry automatically.
        </p>
      )}

      {/* ── Error state ── */}
      {hasError && (
        <div className="w-console-error" role="alert">
          <p className="w-console-error-msg">Unable to load intelligence feed. {intel.error}</p>
          <button className="w-btn w-btn-ghost w-btn-sm" onClick={intel.refetch}>Retry</button>
        </div>
      )}

      {/* ── Feed ── */}
      <div className="w-intel-feed">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 && !hasError ? (
          <div className="w-intel-empty">
            <p>No briefs match the current filters.</p>
            <button
              className="w-btn w-btn-ghost w-btn-sm"
              onClick={() => { setCategoryFilter('All'); setAssetFilter('All'); }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map(brief => (
            <BriefRow key={brief.id} brief={brief} isPremium={isPremium} />
          ))
        )}
      </div>

      {/* ── Updated timestamp ── */}
      {intel.data && (
        <p className="w-intel-updated">
          Feed updated {relativeTime(briefs[0]?.ts ?? new Date().toISOString())}
        </p>
      )}
    </div>
  );
}
