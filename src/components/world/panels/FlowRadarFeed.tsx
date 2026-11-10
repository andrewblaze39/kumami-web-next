'use client';

import type { ConsolePayload, FlowEvent } from '@/lib/market/contracts';
import { formatUsd, relativeTime } from './format';
import { WIcon } from './console-ui';
import { flowLean, type FlowLean } from '@/lib/market/rules/flowDirections';

import { flowEmptyMessage } from '@/lib/market/rules/flowEmpty';
type Props = {
  events: ConsolePayload['flowRadar'];
  loading?: boolean;
  /** Console Pro (v1.18): real-time Flow Radar Pro events instead of the 15-minute-delayed feed. */
  realtime?: boolean;
  /** Console Pro: a coin filter row above the list. */
  toolbar?: React.ReactNode;
};

const TYPE_LABEL: Record<FlowEvent['type'], string> = {
  whale_transfer: 'Whale Transfer',
  exchange_flow: 'Dry Powder',
  liq_spike: 'Liq. Spike',
  netflow_flip: 'Netflow Flip',
  whale_wall: 'Whale Wall',
  smart_money: 'Smart Money',
};

// Reference radar-ic variants: in (green, arrow) = bullish, out (red, bolt) = bearish,
// acc (gold, flame) = neutral. Coloured by the shared v1.15 buckets — before this,
// Inflow (bearish) showed as a green "+" and Outflow (bullish) as a red "−".
type RadarDir = 'in' | 'out' | 'acc';

const LEAN_KIND: Record<FlowLean, RadarDir> = { bullish: 'in', bearish: 'out', neutral: 'acc' };

const DIR_ICON: Record<RadarDir, 'arrowR' | 'bolt' | 'flame'> = {
  in: 'arrowR',
  out: 'bolt',
  acc: 'flame',
};

function topTypeLabel(events: ConsolePayload['flowRadar']): string {
  const counts = new Map<string, number>();
  for (const e of events) {
    const label = TYPE_LABEL[e.type];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let top = '—';
  let max = 0;
  for (const [label, n] of counts) {
    if (n > max) {
      max = n;
      top = label;
    }
  }
  return top;
}

export default function FlowRadarFeed({ events, loading, realtime = false, toolbar }: Props) {
  return (
    <section className="w-apanel" aria-label="Flow Radar" data-tour="flow">
      <div className="w-apanel-h">
        <span className="w-ttl">
          <span className="w-ic"><WIcon name="flame" /></span>
          {' '}Flow Radar{' '}
          <span
            className="w-oc-q"
            tabIndex={0}
            title="Big money leaves footprints. Whale transfers, liquidation cascades, and smart-wallet moves — caught as they happen. Aggregated from large on-chain transfers, exchange liquidations, and tracked whale positions."
          >
            ?
          </span>{' '}
          <span className="w-sub">· whale &amp; fund</span>
        </span>
        {realtime ? (
          <span className="w-adv-updated"><span className="w-live-dot" /> Real-time</span>
        ) : (
          /* Basic Console: the Flow Radar snapshot from 15 min ago. */
          <span className="w-delay-note" title="Flow Radar is 15 minutes behind — Flow Radar Pro is real-time">
            <WIcon name="clock" /> Delayed 15m
          </span>
        )}
      </div>
      {toolbar}

      {loading ? (
        <div className="w-apanel-b">
          <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
        </div>
      ) : events.length === 0 ? (
        <div className="w-apanel-b">
          <p className="w-panel-empty">
            {flowEmptyMessage({ plus: !realtime, eventsInWindow: 0, timeframe: '24H' })}
          </p>
        </div>
      ) : (
        <>
          <div className="w-radar-stat">
            <span className="w-big">{events.length}</span>
            <span className="w-meta">
              signals in last 24h
              <b>Top type · {topTypeLabel(events)}</b>
            </span>
          </div>
          <div className="w-radar-list" aria-label="Flow radar events">
            {events.map(event => {
              const dir = LEAN_KIND[flowLean(event.direction)];
              return (
                <div key={event.id} className="w-radar-item">
                  <span
                    className={`w-radar-ic w-${dir}`}
                    title={`Direction: ${event.direction}`}
                    aria-hidden="true"
                  >
                    <WIcon name={DIR_ICON[dir]} />
                  </span>
                  <div className="w-radar-main">
                    <b>{TYPE_LABEL[event.type]} · {event.asset}</b>
                    <div className="w-rsub">
                      <span className="w-radar-tag">{event.asset}</span> {event.description}
                    </div>
                  </div>
                  <div className="w-radar-amt">
                    <b className={dir === 'out' ? 'w-bear' : dir === 'in' ? 'w-bull' : ''}>
                      {dir === 'out' ? '−' : dir === 'in' ? '+' : ''}
                      {formatUsd(event.amountUsd)}
                    </b>
                    <span>{relativeTime(event.ts)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
