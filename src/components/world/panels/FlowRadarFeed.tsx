'use client';

import type { ConsolePayload, FlowEvent } from '@/lib/market/contracts';
import { formatUsd, relativeTime } from './format';
import { WIcon } from './console-ui';

type Props = {
  events: ConsolePayload['flowRadar'];
  loading?: boolean;
};

const TYPE_LABEL: Record<FlowEvent['type'], string> = {
  whale_transfer: 'Whale Transfer',
  exchange_flow: 'Exchange Flow',
  liq_spike: 'Liq. Spike',
  netflow_flip: 'Netflow Flip',
  whale_wall: 'Whale Wall',
  smart_money: 'Smart Money',
};

// Reference radar-ic variants: in (green, arrow), out (red, bolt), acc (gold, flame)
type RadarDir = 'in' | 'out' | 'acc';

const DIR_KIND: Record<FlowEvent['direction'], RadarDir> = {
  Inflow: 'in',
  'Buy Pressure': 'in',
  'Support Wall': 'in',
  Outflow: 'out',
  'Sell Pressure': 'out',
  'Resistance Wall': 'out',
  Accumulation: 'acc',
  'Smart Money': 'acc',
};

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

export default function FlowRadarFeed({ events, loading }: Props) {
  return (
    <section className="w-apanel" aria-label="Flow Radar">
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
      </div>

      {loading ? (
        <div className="w-apanel-b">
          <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
        </div>
      ) : events.length === 0 ? (
        <div className="w-apanel-b">
          <p className="w-panel-empty">
            No flow events available. Data will appear as signals are detected.
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
              const dir = DIR_KIND[event.direction] ?? 'in';
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
                    <b className={dir === 'out' ? 'w-bear' : 'w-bull'}>
                      {dir === 'out' ? '−' : '+'}
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
