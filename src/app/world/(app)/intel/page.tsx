'use client';

/**
 * /world/intel — Intelligence page.
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

/* ---- Placeholder briefs (reference ADV.intel, verbatim) ---- */
type IntelBrief = {
  tier: 'A' | 'B' | 'C';
  cat: string;
  title: string;
  summary: string;
  src: string;
  time: string;
  tokens: string[];
};

const INTEL: IntelBrief[] = [
  { tier: 'A', cat: 'Macro', title: 'FOMC signals slower rate-cut path; dot plot revised higher', summary: 'Median projection now shows two cuts in 2026 vs three prior — broad risk-asset implication.', src: 'Reuters', time: '9m', tokens: ['BTC', 'GOLD'] },
  { tier: 'A', cat: 'Regulatory', title: 'SEC acknowledges spot ETH staking ETF amendment for review', summary: 'Formal acknowledgement starts the statutory clock; no decision date set.', src: 'Bloomberg', time: '27m', tokens: ['ETH'] },
  { tier: 'B', cat: 'Trade', title: 'HIP3 RWA gold perp open interest surges past $1B in 24h', summary: 'Aggregate OI on the gold perpetual crossed $1B for the first time since launch.', src: 'On-chain', time: '41m', tokens: ['GOLD'] },
  { tier: 'A', cat: 'Security', title: 'Cross-chain bridge pauses withdrawals after anomaly detected', summary: 'Team halted the contract pending audit; ~$0 confirmed lost so far.', src: 'The Block', time: '1h', tokens: ['ETH', 'AVAX'] },
  { tier: 'B', cat: 'Macro', title: 'US CPI prints 0.2% MoM, in line; dollar softens modestly', summary: 'Headline matches consensus; DXY eased 0.3% on the release.', src: 'AP', time: '1h', tokens: ['DXY', 'BTC'] },
  { tier: 'A', cat: 'Narrative', title: 'Capital rotating into AI-token sector; index +12% on the week', summary: 'Sector breadth widening — flows broad rather than single-name driven.', src: 'Kaito', time: '2h', tokens: ['AI', 'ETH'] },
  { tier: 'C', cat: 'Trade', title: 'Funding rates flip positive across majors as longs return', summary: 'BTC, ETH, SOL perpetual funding turned positive in the last 8h window.', src: 'Coinglass', time: '2h', tokens: ['BTC', 'SOL'] },
  { tier: 'B', cat: 'Regulatory', title: 'EU finalises MiCA stablecoin reserve guidance', summary: 'Issuers get a compliance window; aggregate market-structure impact.', src: 'ESMA', time: '3h', tokens: ['USDT', 'USDC'] },
  { tier: 'C', cat: 'Security', title: 'Wallet provider patches signing vulnerability, urges update', summary: 'No active exploitation reported; update advised for all users.', src: 'Vendor', time: '4h', tokens: ['ETH'] },
];

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

      {/* ── Continuity banner ── */}
      <div className="w-cont-banner">
        <span className="w-cb-ic">
          <WIcon name="news" />
        </span>
        <div className="w-cb-main">
          <b>The same stories — analyst-grade.</b>
          <span>
            Every brief here maps to a story in your <b style={{ color: '#f0cd7e' }}>News Portal</b>,
            scored A/B/C with sources and tickers. “What this means for you” is{' '}
            <b style={{ color: '#b9a4ff' }}>Pro</b>.
          </span>
        </div>
        <button className="w-btn w-btn-surface w-btn-sm" onClick={() => setMode('beginner')}>
          <WIcon name="news" /> Back to News Portal
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
              No briefs match this filter.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
