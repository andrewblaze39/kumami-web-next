'use client';

/**
 * /world/intel -- Intelligence page.
 *
 * Pixel-parity port of the reference mockup's R.intel renderer:
 * lead card + "Priority tiers" aside + river of brief rows, with
 * category chips and an asset filter. Placeholder data is the
 * reference ADV.intel array, verbatim.
 *
 * The only deliberate deviation from the reference is the accent
 * colour (mint #5ee9a8 → project turquoise var(--accent)).
 */

import { useState } from 'react';
import { useWorldMode } from '@/contexts/WorldModeContext';
import { WIcon, intelGrad } from '@/components/world/panels/console-ui';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import type { IntelligencePayload } from '@/lib/market/contracts';

/* ---- Live brief shape (mapped from IntelligencePayload) ---- */
type IntelBrief = {
  tier: 'A' | 'B' | 'C';
  cat: string;
  title: string;
  summary: string;
  src: string;
  time: string;
  tokens: string[];
};

/** Normalise the live category into the fixed chip set. */
function normCat(cat: string): string {
  if (cat === 'ETF Flows') return 'Trade';
  if (cat === 'On-Chain') return 'Narrative';
  if (['Macro', 'Trade', 'Narrative', 'Regulatory', 'Security'].includes(cat)) return cat;
  return 'Narrative';
}

/** Short relative time (no "ago" — the template adds it): "9m", "2h", "3d". */
function shortAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function toBriefs(payload: IntelligencePayload | null): IntelBrief[] {
  if (!payload) return [];
  return payload.briefs.map((b) => ({
    tier: b.tier,
    cat: normCat(b.category),
    title: b.headline,
    summary: b.summary,
    src: b.source,
    time: shortAgo(b.ts),
    tokens: b.assets,
  }));
}

/* ---- Categories + colours (reference INTEL_CATS / INTEL_CC) ---- */
const INTEL_CATS = ['All', 'Macro', 'Trade', 'Narrative', 'Regulatory', 'Security'];

const INTEL_CC: Record<string, string> = {
  Macro: '#56dfe6',
  Regulatory: '#56dfe6',
  Trade: '#b9a4ff',
  Narrative: '#e7c06a',
  Security: '#ff6b81',
};

/** Reference fallback is the accent colour (#5ee9a8 → var(--accent)). */
const intelCC = (cat: string) => INTEL_CC[cat] ?? 'var(--accent)';

const ASSETS = ['All', 'BTC', 'ETH', 'SOL', 'GOLD', 'AI'];

/* ---- Token chips ---- */
function Tokens({ tokens }: { tokens: string[] }) {
  return (
    <span className="w-intel-tokens" style={{ marginLeft: 2 }}>
      {tokens.map(t => (
        <span key={t}>{t}</span>
      ))}
    </span>
  );
}

export default function IntelPage() {
  const { setMode } = useWorldMode();
  const [cat, setCat] = useState('All');
  const [asset, setAsset] = useState('All');

  const market = useMarketEndpoint<IntelligencePayload>('/api/market/intelligence');
  const INTEL = toBriefs(market.data);
  const loading = market.status === 'loading';

  const counts: Record<string, number> = {};
  for (const k of INTEL_CATS) {
    counts[k] = k === 'All' ? INTEL.length : INTEL.filter(i => i.cat === k).length;
  }

  const items = INTEL.filter(
    x => (cat === 'All' || x.cat === cat) && (asset === 'All' || x.tokens.includes(asset)),
  );
  const lead = items[0];
  const river = items.slice(1);

  return (
    <div className="w-content-inner w-intel">
      {/* ── Header ── */}
      <div className="w-il-top">
        <h1>
          <WIcon name="doc" /> Intelligence
        </h1>
        <span className="w-il-date">
          <WIcon name="clock" /> The deeper read of your News Portal · AI-scored A/B/C
        </span>
      </div>

      {/* Continuity banner */}
      <div className="w-cont-banner">
        <span className="w-cb-ic">
          <WIcon name="doc" />
        </span>
        <div className="w-cb-main">
          <b>Market briefs, scored by impact.</b>
          <span>Each story is ranked A/B/C so you know what matters most.</span>
        </div>
        <button className="w-btn w-btn-surface w-btn-sm" onClick={() => setMode('beginner')}>
          <WIcon name="news" /> News Portal
        </button>
      </div>

      {/* ── Category chips ── */}
      <div className="w-il-cats">
        {INTEL_CATS.map(k => (
          <button
            key={k}
            className={`w-il-cat${cat === k ? ' on' : ''}`}
            onClick={() => setCat(k)}
          >
            {k}
            <span style={{ opacity: 0.6, marginLeft: 6 }}>{counts[k]}</span>
          </button>
        ))}
      </div>

      {/* ── Asset filter ── */}
      <div className="w-asset-filter" style={{ marginBottom: 22 }}>
        {ASSETS.map(a => (
          <button key={a} className={asset === a ? 'on' : ''} onClick={() => setAsset(a)}>
            {a}
          </button>
        ))}
      </div>

      {/* ── Lead + aside ── */}
      <div className="w-il-grid">
        {lead && (
          <div className="w-il-lead">
            <div
              className="w-il-ph"
              style={{ '--lph': intelGrad(lead.cat) } as React.CSSProperties}
            >
              <div className="w-il-badges">
                <span className="w-tag-badge w-tag-adv">
                  <WIcon name="star" /> Advanced
                </span>
                <span
                  className={`w-tier w-tier-${lead.tier}`}
                  style={{ width: 24, height: 24, borderRadius: 7 }}
                >
                  {lead.tier}
                </span>
              </div>
              <h2>{lead.title}</h2>
            </div>
            <div className="w-il-lead-body">
              <span className="w-art-cat" style={{ color: intelCC(lead.cat) }}>
                {lead.cat}
              </span>
              <p className="w-il-lead-exc" style={{ marginTop: 8 }}>
                {lead.summary}
              </p>
              <div className="w-art-meta">
                <span className="w-src">{lead.src}</span>
                <span className="w-dot-sep" />
                <span>{lead.time} ago</span>
                <Tokens tokens={lead.tokens} />
                <span className="w-adv-link" style={{ margin: 0 }}>
                  <WIcon name="arrowR" /> Read source
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="w-il-aside">
          <h3 className="w-il-aside-h">
            <WIcon name="star" /> Priority tiers
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              fontSize: 13,
              color: 'var(--muted)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span className="w-tier w-tier-A">A</span> Market-moving
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span className="w-tier w-tier-B">B</span> Notable
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span className="w-tier w-tier-C">C</span> Context
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.5, margin: '16px 0 0' }}>
            Filter by category or asset above to narrow the brief to what you hold.
          </p>
        </div>
      </div>

      {/* ── River ── */}
      <div className="w-il-river">
        <h3 className="w-il-river-h">Latest briefs</h3>
        <div className="w-il-list">
          {river.length > 0 ? (
            river.map(x => (
              <div className="w-il-row" key={x.title}>
                <div
                  className="w-il-thumb"
                  style={{ '--rph': intelGrad(x.cat) } as React.CSSProperties}
                >
                  <span className="w-il-tl">
                    <span
                      className={`w-tier w-tier-${x.tier}`}
                      style={{ width: 24, height: 24, borderRadius: 7 }}
                    >
                      {x.tier}
                    </span>
                  </span>
                </div>
                <div className="w-il-rbody">
                  <span className="w-art-cat" style={{ color: intelCC(x.cat) }}>
                    {x.cat}
                  </span>
                  <h3>{x.title}</h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--muted)',
                      lineHeight: 1.5,
                      margin: '0 0 8px',
                      textWrap: 'pretty',
                    }}
                  >
                    {x.summary}
                  </p>
                  <div className="w-art-meta">
                    <span className="w-src">{x.src}</span>
                    <span className="w-dot-sep" />
                    <span>{x.time} ago</span>
                    <Tokens tokens={x.tokens} />
                  </div>
                </div>
              </div>
            ))
          ) : !lead ? (
            <div
              style={{
                padding: 50,
                textAlign: 'center',
                color: 'var(--muted)',
                gridColumn: '1/-1',
              }}
            >
              {loading ? 'Loading live briefs…' : 'No briefs match this filter.'}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
