'use client';

/**
 * Flow Radar — one component, two versions (Andrew's spec v1.6):
 *   variant="plus" → Flow Radar Plus (/world/flow-radar, every account):
 *     BTC/ETH/SOL/BNB/HYPE, HIGH+MED, 4 event types, 15-min delayed snapshot,
 *     no Flow Balance panel, no cross-signal outlines.
 *   variant="pro"  → Flow Radar Pro (/world/pro?tab=flowradar, Pro accounts):
 *     every coin, LOW added, real-time, Flow Balance, cross-signal outlines,
 *     multi-select assets, 7D timeframe.
 * The server enforces the version via ?view= (Pro data needs a Pro account);
 * no threshold/gating logic lives here.
 */

import { useEffect, useMemo, useState } from 'react';
import type { FlowEvent, FlowRadarPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { formatUsd, relativeTime } from '@/components/world/panels/format';
import { WIcon, CoinBadge } from '@/components/world/panels/console-ui';
import ProductTour, { type TourStep } from '@/components/world/ProductTour';
import { computeFlowBalance } from '@/lib/market/rules/flowBalance';
import { computeFlowVerdict } from '@/lib/market/rules/flowVerdict';
import { flowLean } from '@/lib/market/rules/flowDirections';

type Payload = FlowRadarPayload & {
  /** AI rewrite of the band sentence per window (v1.15 Plus §3), present only when the AI answered. */
  aiSentences?: Partial<Record<Timeframe, { verdict: string; text: string }>>;
  /** AI layer switched on (false → "AI read · coming soon"). */
  aiOn?: boolean;
  delayed?: boolean; delayMinutes?: number; delayedAsOf?: string | null };

/** Which version to render (Andrew's spec v1.6): the Plus page always renders
 *  'plus' (even for Pro accounts); the Pro tab /world/pro?tab=flowradar renders
 *  'pro'. The server enforces it too (?view=, Pro data needs a Pro account). */
export type ToolVariant = 'plus' | 'pro';

const FLOW_RADAR_TOUR: TourStep[] = [
  {
    title: 'Where big money moves first 👋',
    body: "Whale transfers, exchange flow, liquidation spikes and smart-money positions — a live feed of the events that tend to move price before the headlines catch up. Quick tour? Leave anytime.",
  },
  {
    selector: '[data-tour="fr-types"]',
    title: 'Four event types',
    body: 'Whale Transfer (coins deposited to or withdrawn from an exchange), Exchange Flow ("Dry Powder": stablecoins arriving on or leaving exchanges — buying power), Liquidation Spike (forced closures — a long flush or a short squeeze), and Smart Money (large Hyperliquid positions opened or closed). Pro adds Netflow Flip.',
  },
  {
    selector: '[data-tour="fr-assets"]',
    title: 'Filter by asset',
    body: 'Narrow to one asset, or leave it on All. Plus is scoped to 5 majors; Pro searches and multi-selects across the full tracked universe.',
  },
  {
    selector: '[data-tour="fr-severity"]',
    title: 'HIGH / MED / LOW severity',
    body: 'Each event type has its own dollar thresholds for what counts as HIGH vs MED. LOW-severity events are Pro-only — Plus filters them out to keep the feed focused on what matters.',
  },
  {
    selector: '[data-tour="fr-verdict"]',
    title: 'The market verdict band',
    body: 'A one-line read on the window you picked — Liquidation Cascade, Distribution Wave, Broad Accumulation, Mixed, or Quiet. One side has to outweigh the other 1.5×, and the dollar bar rises with the window (1H is half of 4H, 24H is 2.5×).',
  },
  {
    selector: '[data-tour="fr-feed"]',
    title: 'Reading a row',
    body: 'The icon shows bullish (→), bearish (⚡) or neutral (closed positions, two-sided flushes — shown but not counted), the badge shows severity, and the dollar amount is signed to match. A coloured outline appears when another Kumami panel (Spot Pulse, the Console regime, or repeated whale flow) confirms the same read — hover the row to see why.',
  },
  {
    title: "That's Flow Radar 🎉",
    body: 'Replay this anytime with the "Take a tour" button. Explore the rest of the tools from the sidebar.',
  },
];

const EVENT_TYPES: { key: FlowEvent['type']; label: string; dot: string }[] = [
  { key: 'whale_transfer', label: 'Whale Transfer', dot: '#46e3a0' },
  { key: 'exchange_flow', label: 'Exchange Flow', dot: '#56dfe6' },
  { key: 'liq_spike', label: 'Liquidation Spike', dot: '#ff6b81' },
  { key: 'smart_money', label: 'Smart Money', dot: '#b9a4ff' },
];
/** Pro keeps Netflow Flip as a fifth type (Rachelle v1.15 Pro §18). */
const PRO_EVENT_TYPES = [...EVENT_TYPES, { key: 'netflow_flip' as const, label: 'Netflow Flip', dot: '#f0cd7e' }];

const ASSETS = ['All', 'BTC', 'ETH', 'SOL', 'BNB', 'HYPE'] as const;
type AssetFilter = (typeof ASSETS)[number];

const SEVERITIES: FlowEvent['severity'][] = ['HIGH', 'MED'];
const PRO_SEVERITIES: FlowEvent['severity'][] = ['HIGH', 'MED', 'LOW'];
const TIMEFRAMES = ['1H', '4H', '24H'] as const;
const PRO_TIMEFRAMES = ['1H', '4H', '24H', '7D'] as const;
type Timeframe = (typeof PRO_TIMEFRAMES)[number];
const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1H': 3_600_000,
  '4H': 4 * 3_600_000,
  '24H': 24 * 3_600_000,
  '7D': 7 * 24 * 3_600_000,
};

const TYPE_LABEL: Record<FlowEvent['type'], string> = {
  whale_transfer: 'Whale Transfer',
  exchange_flow: 'Exchange Flow',
  liq_spike: 'Liquidation Spike',
  netflow_flip: 'Netflow Flip',
  whale_wall: 'Whale Wall',
  smart_money: 'Smart Money',
};


const VERDICT_TONE: Record<string, string> = {
  green: 'w-bull',
  'grey-green': 'w-bull',
  grey: 'w-muted',
  amber: 'w-flat',
  'grey-red': 'w-bear',
  red: 'w-bear',
};

const PAGE_SIZE = 8;

export default function FlowRadarView({ variant }: { variant: ToolVariant }) {
  const { status, data } = useMarketEndpoint<Payload>(`/api/market/flow-radar?view=${variant}`);
  // "Pro" here means the Pro VERSION of the tool, not the account.
  const isPremium = variant === 'pro';

  const typeChips = isPremium ? PRO_EVENT_TYPES : EVENT_TYPES;
  const [types, setTypes] = useState<Set<FlowEvent['type']>>(
    new Set(typeChips.map((t) => t.key)),
  );
  // Plus: single-select fixed roster. Pro: multi-select against the live
  // asset universe (empty set = "All", per Kumami Pro §4.6a's default).
  const [asset, setAsset] = useState<AssetFilter>('All');
  const [proAssets, setProAssets] = useState<Set<string>>(new Set());
  const [proAssetSearch, setProAssetSearch] = useState('');
  const [severities, setSeverities] = useState<Set<FlowEvent['severity']>>(new Set(SEVERITIES));
  const [timeframe, setTimeframe] = useState<Timeframe>('24H');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [tourOpen, setTourOpen] = useState(false);

  // Auto-open once for first-time visitors.
  useEffect(() => {
    try {
      if (!localStorage.getItem('kumami_tour_flow_radar_seen')) {
        const t = setTimeout(() => setTourOpen(true), 700);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage unavailable — skip auto-open */ }
  }, []);

  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem('kumami_tour_flow_radar_seen', '1'); } catch { /* ignore */ }
  };

  const toggleType = (key: FlowEvent['type']) => {
    setVisibleCount(PAGE_SIZE);
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSeverity = (sev: FlowEvent['severity']) => {
    setVisibleCount(PAGE_SIZE);
    setSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  const toggleProAsset = (sym: string) => {
    setVisibleCount(PAGE_SIZE);
    setProAssets((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  const events = data?.events ?? [];
  const now = Date.now();
  const windowMs = TIMEFRAME_MS[timeframe];
  const universe = data?.footer.assets ?? [];
  const visibleAssetChips = proAssetSearch
    ? universe.filter((a) => a.toLowerCase().includes(proAssetSearch.toLowerCase()))
    : universe;

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          types.has(e.type) &&
          severities.has(e.severity) &&
          // Dry Powder is market-wide: it shows under every asset filter (v1.15 Plus §3).
          (e.marketWide || (isPremium ? (proAssets.size === 0 || proAssets.has(e.asset)) : (asset === 'All' || e.asset === asset))) &&
          now - Date.parse(e.ts) <= windowMs,
      ),
    [events, types, severities, asset, isPremium, proAssets, windowMs, now],
  );

  // Verdict band for the selected window (thresholds scale with it — v1.15 Plus §3).
  const band = useMemo(() => computeFlowVerdict(filtered, timeframe), [filtered, timeframe]);
  // The server's AI sentence describes the unfiltered window, so it's only used while no
  // asset / type / severity filter is on and the verdicts agree. No template sentence in
  // its place (Andrew's hard rule, 22 Oct 2026): AI off → "coming soon", otherwise nothing.
  const unfiltered = types.size === typeChips.length && severities.size === SEVERITIES.length
    && (isPremium ? proAssets.size === 0 : asset === 'All');
  const ai = data?.aiSentences?.[timeframe];
  const aiText = unfiltered && ai?.verdict === band.verdict.label ? ai.text : null;

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;
  const totalUsd = filtered.reduce((sum, e) => sum + e.amountUsd, 0);

  // Flow Balance Panel (Pro) — always a fixed 24H window, independent of the
  // user's selected timeframe toggle above (Kumami Pro §1.5).
  const flowBalance = useMemo(() => {
    const events24h = events.filter((e) => now - Date.parse(e.ts) <= TIMEFRAME_MS['24H']);
    return computeFlowBalance(events24h);
  }, [events, now]);

  return (
    <div className="w-content-inner">
      <div className="w-oc-head">
        <div className="w-oc-head-top">
          <div>
            <h1>
              <WIcon name="flame" /> {isPremium ? 'Flow Radar Pro' : 'Flow Radar Plus'}
            </h1>
            <p className="w-oc-sub">
              {isPremium ? 'Where big money is moving — right now' : 'Where big money is moving — 15 minutes behind (real-time in Flow Radar Pro)'}
            </p>
            <button type="button" className="w-tour-trigger" onClick={() => setTourOpen(true)} style={{ marginTop: 10 }}>
              <WIcon name="spark" /> Take a tour
            </button>
          </div>
          <div className="w-oc-controls">
            {/* By VERSION, not payload: before data loads (or if it fails) Plus must never claim "Live". */}
            {!isPremium ? (
              <span className="w-adv-updated" title="Flow Radar Plus is delayed — Flow Radar Pro is real-time">
                <WIcon name="clock" /> Delayed {data?.delayMinutes ?? 15}m
              </span>
            ) : (
              <span className="w-adv-updated">
                <span className="w-live-dot" /> Live
              </span>
            )}
            <div className="w-flow-radar-timeframe">
              {(isPremium ? PRO_TIMEFRAMES : TIMEFRAMES).map((tf) => (
                <button
                  key={tf}
                  className={tf === timeframe ? 'on' : ''}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-flow-radar-filters">
        <div className="w-flow-radar-chip-row" data-tour="fr-types">
          {typeChips.map((t) => (
            <button
              key={t.key}
              className={`w-flow-radar-chip${types.has(t.key) ? ' on' : ''}`}
              onClick={() => toggleType(t.key)}
            >
              <span className="w-flow-radar-dot" style={{ background: t.dot }} />
              {t.label}
            </button>
          ))}
        </div>
        {isPremium ? (
          <div className="w-flow-radar-pro-assets" data-tour="fr-assets">
            <input
              type="text"
              className="w-flow-radar-asset-search"
              placeholder="Search the tracked universe…"
              value={proAssetSearch}
              onChange={(e) => setProAssetSearch(e.target.value)}
              aria-label="Search assets"
            />
            <div className="w-oc-asset-tabs">
              <button className={proAssets.size === 0 ? 'on' : ''} onClick={() => setProAssets(new Set())}>
                All
              </button>
              {visibleAssetChips.map((a) => (
                <button key={a} className={proAssets.has(a) ? 'on' : ''} onClick={() => toggleProAsset(a)}>
                  <CoinBadge sym={a} size={17} />
                  {a}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-oc-asset-tabs" data-tour="fr-assets">
            {ASSETS.map((a) => (
              <button
                key={a}
                className={a === asset ? 'on' : ''}
                onClick={() => {
                  setVisibleCount(PAGE_SIZE);
                  setAsset(a);
                }}
              >
                {a !== 'All' && <CoinBadge sym={a} size={17} />}
                {a}
              </button>
            ))}
          </div>
        )}
        <div className="w-flow-radar-chip-row" data-tour="fr-severity">
          {(isPremium ? PRO_SEVERITIES : SEVERITIES).map((sev) => (
            <button
              key={sev}
              className={`w-flow-radar-chip w-flow-radar-sev-${sev.toLowerCase()}${severities.has(sev) ? ' on' : ''}`}
              onClick={() => toggleSeverity(sev)}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' ? (
        <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" style={{ minHeight: 220 }} />
      ) : data ? (
        <>
          <div className={`w-flow-radar-verdict w-flow-radar-verdict-${band.verdict.color}`} data-tour="fr-verdict">
            <div>
              <span className={`w-flow-radar-verdict-label ${VERDICT_TONE[band.verdict.color] ?? 'w-muted'}`}>
                <WIcon name="bolt" /> {band.verdict.label}
              </span>
              {aiText ? (
                <p title="Written by AI from the verdict — the verdict itself comes from the rule engine">{aiText}</p>
              ) : data.aiOn === false ? (
                <p className="w-ai-soon">AI read · coming soon</p>
              ) : null}
            </div>
            <div className="w-flow-radar-verdict-stat">{band.statLine}</div>
          </div>

          {isPremium && (
            <div className="w-flow-balance" data-tour="fr-balance">
              <div className="w-flow-balance-h">
                <span className="w-ttl">Flow balance</span>
                <span className="w-sub">Last 24H</span>
              </div>
              <div className="w-flow-balance-rows">
                <div className="w-flow-balance-row">
                  <span className="w-bull">🟢 Bullish flow</span>
                  <b className="w-bull">{formatUsd(flowBalance.bullishUsd)}</b>
                </div>
                <div className="w-flow-balance-row">
                  <span className="w-bear">🔴 Bearish flow</span>
                  <b className="w-bear">{formatUsd(flowBalance.bearishUsd)}</b>
                </div>
              </div>
              {/* No directional flow → say so; never a made-up 50/50 split (Andrew's hard rule, 22 Oct 2026). */}
              {flowBalance.bullishUsd + flowBalance.bearishUsd === 0 ? (
                <p className="w-ai-soon">No bullish or bearish flow in the last 24h.</p>
              ) : (<>
              <div className="w-flow-balance-bar">
                <div className="w-flow-balance-bar-bull" style={{ width: `${flowBalance.bullishPct}%` }} />
                <div className="w-flow-balance-bar-bear" style={{ width: `${flowBalance.bearishPct}%` }} />
              </div>
              <div className="w-flow-balance-pct">
                <span>{flowBalance.bullishPct}%</span>
                <span>{flowBalance.bearishPct}%</span>
              </div>
              <div className="w-flow-balance-net">
                <span>NET</span>
                <span className={flowBalance.netUsd >= 0 ? 'w-bull' : 'w-bear'}>
                  {flowBalance.netUsd >= 0 ? '+' : '−'}
                  {formatUsd(Math.abs(flowBalance.netUsd))} {flowBalance.verdict}
                </span>
              </div>
              </>)}
            </div>
          )}

          <section className="w-apanel" aria-label="Flow Radar live feed" data-tour="fr-feed">
            <div className="w-apanel-h">
              <span className="w-ttl">Live feed</span>
              <span className="w-sub">{filtered.length} events · {timeframe}</span>
            </div>
            {data?.delayed && data.delayedAsOf === null ? (
              <div className="w-apanel-b">
                <p className="w-panel-empty">
                  The {data.delayMinutes ?? 15}-minute delayed feed is starting — check back in a few minutes. Flow Radar Pro shows events in real time.
                </p>
              </div>
            ) : visible.length === 0 ? (
              <div className="w-apanel-b">
                <p className="w-panel-empty">No events match these filters right now.</p>
              </div>
            ) : (
              <div className="w-radar-list" aria-label="Flow radar events">
                {visible.map((event) => {
                  const lean = flowLean(event.direction);
                  const bullish = lean === 'bullish';
                  const neutral = lean === 'neutral';
                  return (
                    <div
                      key={event.id}
                      className={`w-radar-item${event.crossSignal ? ` w-radar-item-cross-${event.crossSignal.color}` : ''}`}
                      title={event.crossSignal ? `${event.crossSignal.label} — confirmed by another Kumami panel` : undefined}
                    >
                      <span
                        className={`w-radar-ic ${neutral ? 'w-acc' : bullish ? 'w-in' : 'w-out'}`}
                        title={`Direction: ${event.direction}${neutral ? ' (neutral — not counted)' : ''}`}
                        aria-hidden="true"
                      >
                        <WIcon name={neutral ? 'flame' : bullish ? 'arrowR' : 'bolt'} />
                      </span>
                      <div className="w-radar-main">
                        <b>
                          {TYPE_LABEL[event.type]} <span className="w-flow-radar-asset-tag">{event.asset}</span>{' '}
                          <span className="w-flow-radar-dir">{event.direction}</span>{' '}
                          <span className={`w-flow-radar-sev-badge w-flow-radar-sev-${event.severity.toLowerCase()}`}>
                            {event.severity}
                          </span>
                        </b>
                        <div className="w-rsub">{event.description}</div>
                      </div>
                      <div className="w-radar-amt">
                        <b className={neutral ? '' : bullish ? 'w-bull' : 'w-bear'}>
                          {neutral ? '' : bullish ? '+' : '−'}
                          {formatUsd(event.amountUsd)}
                        </b>
                        <span>{relativeTime(event.ts)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {remaining > 0 && (
              <div className="w-apanel-foot">
                <button
                  className="w-btn w-btn-ghost w-btn-sm"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Load {Math.min(PAGE_SIZE, remaining)} more · {remaining} remaining
                </button>
              </div>
            )}
          </section>

          <div className="w-flow-radar-footer">
            <span>
              {/* No "$0" when the window is empty (quiet market, or the delayed feed just started). */}
              {filtered.length === 0
                ? `No events in ${timeframe} yet`
                : `${filtered.length} event${filtered.length === 1 ? '' : 's'} in ${timeframe} · ${formatUsd(totalUsd)}`}{' '}
              across {isPremium ? `${data.footer.assets.length} tracked assets` : 'BTC / ETH / SOL / BNB / HYPE'}
            </span>
            {!isPremium && (
              <span className="w-flow-radar-pro-nudge">Every coin, every severity, in real time → Flow Radar Pro</span>
            )}
          </div>
        </>
      ) : (
        <p className="w-panel-empty">Couldn&apos;t load Flow Radar right now.</p>
      )}

      {tourOpen && <ProductTour steps={FLOW_RADAR_TOUR} onClose={closeTour} />}
    </div>
  );
}
