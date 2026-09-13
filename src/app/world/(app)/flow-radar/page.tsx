'use client';

/**
 * /world/flow-radar — standalone Flow Radar tab (Plus tier).
 *
 * Server already restricts the universe to the fixed 5-asset roster
 * (BTC/ETH/SOL/BNB/HYPE), HIGH+MED severity, and the 4 Plus event types
 * (Kumami Plus §4.1). Client-side controls below only slice that already-
 * scoped list for display — no threshold/gating logic lives here.
 */

import { useMemo, useState } from 'react';
import type { FlowEvent, FlowRadarPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { formatUsd, relativeTime } from '@/components/world/panels/format';
import { WIcon, CoinBadge } from '@/components/world/panels/console-ui';

type Payload = FlowRadarPayload & { delayed?: boolean; delayMinutes?: number };

const EVENT_TYPES: { key: FlowEvent['type']; label: string; dot: string }[] = [
  { key: 'whale_transfer', label: 'Whale Transfer', dot: '#46e3a0' },
  { key: 'exchange_flow', label: 'Exchange Flow', dot: '#56dfe6' },
  { key: 'liq_spike', label: 'Liquidation Spike', dot: '#ff6b81' },
  { key: 'smart_money', label: 'Smart Money', dot: '#b9a4ff' },
];

const ASSETS = ['All', 'BTC', 'ETH', 'SOL', 'BNB', 'HYPE'] as const;
type AssetFilter = (typeof ASSETS)[number];

const SEVERITIES: FlowEvent['severity'][] = ['HIGH', 'MED'];
const TIMEFRAMES = ['1H', '4H', '24H'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];
const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1H': 3_600_000,
  '4H': 4 * 3_600_000,
  '24H': 24 * 3_600_000,
};

const TYPE_LABEL: Record<FlowEvent['type'], string> = {
  whale_transfer: 'Whale Transfer',
  exchange_flow: 'Exchange Flow',
  liq_spike: 'Liquidation Spike',
  netflow_flip: 'Netflow Flip',
  whale_wall: 'Whale Wall',
  smart_money: 'Smart Money',
};

const BULLISH_DIRECTIONS = new Set<FlowEvent['direction']>([
  'Outflow', 'Buy Pressure', 'Support Wall', 'Accumulation', 'Smart Money',
]);

const VERDICT_TONE: Record<string, string> = {
  green: 'w-bull',
  'grey-green': 'w-bull',
  grey: 'w-muted',
  amber: 'w-flat',
  'grey-red': 'w-bear',
  red: 'w-bear',
};

const PAGE_SIZE = 8;

export default function FlowRadarPage() {
  const { status, data } = useMarketEndpoint<Payload>('/api/market/flow-radar');

  const [types, setTypes] = useState<Set<FlowEvent['type']>>(
    new Set(EVENT_TYPES.map((t) => t.key)),
  );
  const [asset, setAsset] = useState<AssetFilter>('All');
  const [severities, setSeverities] = useState<Set<FlowEvent['severity']>>(new Set(SEVERITIES));
  const [timeframe, setTimeframe] = useState<Timeframe>('24H');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  const events = data?.events ?? [];
  const now = Date.now();
  const windowMs = TIMEFRAME_MS[timeframe];

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          types.has(e.type) &&
          severities.has(e.severity) &&
          (asset === 'All' || e.asset === asset) &&
          now - Date.parse(e.ts) <= windowMs,
      ),
    [events, types, severities, asset, windowMs, now],
  );

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;
  const totalUsd = filtered.reduce((sum, e) => sum + e.amountUsd, 0);

  return (
    <div className="w-content-inner">
      <div className="w-oc-head">
        <div className="w-oc-head-top">
          <div>
            <h1>
              <WIcon name="flame" /> Flow Radar
            </h1>
            <p className="w-oc-sub">Where big money is moving — right now</p>
          </div>
          <div className="w-oc-controls">
            <span className="w-adv-updated">
              <span className="w-live-dot" /> Live
            </span>
            <div className="w-flow-radar-timeframe">
              {TIMEFRAMES.map((tf) => (
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
        <div className="w-flow-radar-chip-row">
          {EVENT_TYPES.map((t) => (
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
        <div className="w-oc-asset-tabs">
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
        <div className="w-flow-radar-chip-row">
          {SEVERITIES.map((sev) => (
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
          <div className={`w-flow-radar-verdict w-flow-radar-verdict-${data.verdict.color}`}>
            <div>
              <span className={`w-flow-radar-verdict-label ${VERDICT_TONE[data.verdict.color] ?? 'w-muted'}`}>
                <WIcon name="bolt" /> {data.verdict.label}
              </span>
              <p>{data.sentence}</p>
            </div>
            <div className="w-flow-radar-verdict-stat">{data.statLine}</div>
          </div>

          <section className="w-apanel" aria-label="Flow Radar live feed">
            <div className="w-apanel-h">
              <span className="w-ttl">Live feed</span>
              <span className="w-sub">{filtered.length} events · {timeframe}</span>
            </div>
            {visible.length === 0 ? (
              <div className="w-apanel-b">
                <p className="w-panel-empty">No events match these filters right now.</p>
              </div>
            ) : (
              <div className="w-radar-list" aria-label="Flow radar events">
                {visible.map((event) => {
                  const bullish = BULLISH_DIRECTIONS.has(event.direction);
                  return (
                    <div key={event.id} className="w-radar-item">
                      <span
                        className={`w-radar-ic ${bullish ? 'w-in' : 'w-out'}`}
                        title={`Direction: ${event.direction}`}
                        aria-hidden="true"
                      >
                        <WIcon name={bullish ? 'arrowR' : 'bolt'} />
                      </span>
                      <div className="w-radar-main">
                        <b>
                          {TYPE_LABEL[event.type]} <span className="w-flow-radar-asset-tag">{event.asset}</span>{' '}
                          <span className={`w-flow-radar-sev-badge w-flow-radar-sev-${event.severity.toLowerCase()}`}>
                            {event.severity}
                          </span>
                        </b>
                        <div className="w-rsub">{event.description}</div>
                      </div>
                      <div className="w-radar-amt">
                        <b className={bullish ? 'w-bull' : 'w-bear'}>
                          {bullish ? '+' : '−'}
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
              {filtered.length} events in {timeframe} · {formatUsd(totalUsd)} across BTC / ETH / SOL / BNB / HYPE
            </span>
            <span className="w-flow-radar-pro-nudge">See events on 100+ assets + push alerts → Pro</span>
          </div>
        </>
      ) : (
        <p className="w-panel-empty">Couldn&apos;t load Flow Radar right now.</p>
      )}
    </div>
  );
}
