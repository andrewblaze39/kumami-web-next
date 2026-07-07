'use client';

import type { ConsolePayload, FlowEvent } from '@/lib/market/contracts';
import { formatUsd, relativeTime } from './format';

type Props = {
  events: ConsolePayload['flowRadar'];
  updatedAt: string;
  loading?: boolean;
};

const SEVERITY_CLASS: Record<FlowEvent['severity'], string> = {
  HIGH: 'w-severity-high',
  MED: 'w-severity-med',
  LOW: 'w-severity-low',
};

const DIRECTION_ICON: Record<FlowEvent['direction'], string> = {
  Inflow: '↓',
  Outflow: '↑',
  Accumulation: '⊕',
  'Smart Money': '◈',
  'Buy Pressure': '▲',
  'Sell Pressure': '▼',
  'Resistance Wall': '⊟',
  'Support Wall': '⊞',
};

const TYPE_LABEL: Record<FlowEvent['type'], string> = {
  whale_transfer: 'Whale Transfer',
  exchange_flow: 'Exchange Flow',
  liq_spike: 'Liq. Spike',
  netflow_flip: 'Netflow Flip',
  whale_wall: 'Whale Wall',
  smart_money: 'Smart Money',
};

export default function FlowRadarFeed({ events, updatedAt, loading }: Props) {
  const highCount = events.filter(e => e.severity === 'HIGH').length;
  const medCount = events.filter(e => e.severity === 'MED').length;

  return (
    <section className="w-panel w-panel-flow" aria-label="Flow Radar">
      <div className="w-panel-header">
        <div className="w-panel-header-left">
          <span className="w-panel-eyebrow">Flow Radar</span>
          {!loading && events.length > 0 && (
            <div className="w-flow-stats" aria-label="Signal counts">
              {highCount > 0 && (
                <span
                  className="w-flow-stat w-severity-high"
                  title={`${highCount} high-severity signal${highCount !== 1 ? 's' : ''}`}
                >
                  {highCount} HIGH
                </span>
              )}
              {medCount > 0 && (
                <span
                  className="w-flow-stat w-severity-med"
                  title={`${medCount} medium-severity signal${medCount !== 1 ? 's' : ''}`}
                >
                  {medCount} MED
                </span>
              )}
            </div>
          )}
        </div>
        <time className="w-panel-ts" dateTime={updatedAt} title={updatedAt}>
          {relativeTime(updatedAt)}
        </time>
      </div>

      {loading ? (
        <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" />
      ) : events.length === 0 ? (
        <p className="w-panel-empty">No flow events available. Data will appear as signals are detected.</p>
      ) : (
        <ul className="w-flow-list" aria-label="Flow radar events">
          {events.map(event => (
            <li
              key={event.id}
              className={`w-flow-event ${SEVERITY_CLASS[event.severity]}`}
              aria-label={`${event.severity} severity ${TYPE_LABEL[event.type]} for ${event.asset}`}
            >
              <div className="w-flow-icon-wrap">
                <span
                  className={`w-flow-direction-icon`}
                  title={`Direction: ${event.direction}`}
                  aria-hidden="true"
                >
                  {DIRECTION_ICON[event.direction]}
                </span>
                <span
                  className={`w-flow-severity-dot ${SEVERITY_CLASS[event.severity]}`}
                  title={`Severity: ${event.severity}`}
                  aria-hidden="true"
                />
              </div>
              <div className="w-flow-body">
                <div className="w-flow-row1">
                  <span
                    className="w-flow-type"
                    title={TYPE_LABEL[event.type]}
                  >
                    {TYPE_LABEL[event.type]}
                  </span>
                  <span className="w-flow-asset">{event.asset}</span>
                  <span
                    className="w-flow-amount"
                    title={`Amount: ${formatUsd(event.amountUsd)}`}
                  >
                    {formatUsd(event.amountUsd)}
                  </span>
                </div>
                <p className="w-flow-desc">{event.description}</p>
                {event.interpretation && (
                  <p className="w-flow-interp">{event.interpretation}</p>
                )}
              </div>
              <time
                className="w-flow-ts"
                dateTime={event.ts}
                title={event.ts}
              >
                {relativeTime(event.ts)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
