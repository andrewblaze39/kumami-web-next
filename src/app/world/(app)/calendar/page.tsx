'use client';

/**
 * /world/calendar — standalone Calendar tab (Plus tier).
 *
 * Scoping notes (disclosed, not silently cut):
 *   - List view only. The doc also specs a day/week/month grid ("Main View")
 *     with a list-view toggle — the grid is a separate, larger UI piece not
 *     built yet; this ships the list view as the primary (and only) view.
 *   - "Protocol" events (governance votes, mainnet launches) are described as
 *     editorial/manual entries — no such content pipeline exists yet, so the
 *     filter chip exists but the type is always empty.
 *   - The D-1 popup here fires on this page specifically (on mount, once per
 *     browser via localStorage), not truly "on next login" app-wide as the
 *     doc describes — a global version would need to live in the shell layout.
 */

import { useEffect, useMemo, useState } from 'react';
import type { CalendarEvent, CalendarPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from '@/components/world/panels/useMarketEndpoint';
import { WIcon } from '@/components/world/panels/console-ui';

const TYPES: { key: CalendarEvent['type'] | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'macro', label: 'Macro' },
  { key: 'unlock', label: 'Token Unlocks' },
  { key: 'protocol', label: 'Protocol' },
];

const IMPACTS: CalendarEvent['impact'][] = ['HIGH', 'MED', 'LOW'];
const ASSETS = ['All', 'BTC', 'ETH', 'SOL', 'BNB', 'HYPE'] as const;
type AssetFilter = (typeof ASSETS)[number];

const TIMEFRAMES = ['Today', 'This Week', 'Next 30D'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];
const TIMEFRAME_MS: Record<Timeframe, number> = {
  Today: 24 * 3_600_000,
  'This Week': 7 * 24 * 3_600_000,
  'Next 30D': 30 * 24 * 3_600_000,
};

const IMPACT_BADGE: Record<CalendarEvent['impact'], string> = {
  HIGH: 'w-flow-radar-sev-badge w-flow-radar-sev-high',
  MED: 'w-flow-radar-sev-badge w-flow-radar-sev-med',
  LOW: 'w-flow-radar-sev-badge w-flow-radar-sev-low',
};

const TYPE_ICON: Record<CalendarEvent['type'], string> = {
  macro: '🌐',
  unlock: '🔓',
  protocol: '🗳️',
};

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const D1_DISMISSED_KEY = 'kumami_calendar_d1_dismissed';

export default function CalendarPage() {
  const { status, data } = useMarketEndpoint<CalendarPayload>('/api/market/calendar');
  const [type, setType] = useState<(typeof TYPES)[number]['key']>('all');
  const [impacts, setImpacts] = useState<Set<CalendarEvent['impact']>>(new Set(IMPACTS));
  const [asset, setAsset] = useState<AssetFilter>('All');
  const [timeframe, setTimeframe] = useState<Timeframe>('This Week');
  const [popupEvent, setPopupEvent] = useState<CalendarEvent | null>(null);

  const events = data?.events ?? [];

  // D-1 popup: first HIGH-impact event in the next 24h, not yet dismissed this browser.
  useEffect(() => {
    if (!data) return;
    const now = Date.now();
    let dismissed: string[] = [];
    try {
      dismissed = JSON.parse(localStorage.getItem(D1_DISMISSED_KEY) ?? '[]');
    } catch {
      dismissed = [];
    }
    const upcoming = data.events.find((e) => {
      const dt = Date.parse(e.ts) - now;
      return e.impact === 'HIGH' && dt > 0 && dt <= 24 * 3_600_000 && !dismissed.includes(e.id);
    });
    if (upcoming) setPopupEvent(upcoming);
  }, [data]);

  const dismissPopup = (event: CalendarEvent) => {
    try {
      const dismissed: string[] = JSON.parse(localStorage.getItem(D1_DISMISSED_KEY) ?? '[]');
      localStorage.setItem(D1_DISMISSED_KEY, JSON.stringify([...dismissed, event.id]));
    } catch {
      // ignore storage errors
    }
    setPopupEvent(null);
  };

  const toggleImpact = (imp: CalendarEvent['impact']) => {
    setImpacts((prev) => {
      const next = new Set(prev);
      if (next.has(imp)) next.delete(imp);
      else next.add(imp);
      return next;
    });
  };

  const now = Date.now();
  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (type !== 'all' && e.type !== type) return false;
        if (!impacts.has(e.impact)) return false;
        if (asset !== 'All' && !e.assets.includes(asset)) return false;
        const dt = Math.abs(Date.parse(e.ts) - now);
        return dt <= TIMEFRAME_MS[timeframe];
      }),
    [events, type, impacts, asset, timeframe, now],
  );

  return (
    <div className="w-content-inner">
      <div className="w-oc-head">
        <div className="w-oc-head-top">
          <div>
            <h1>
              <WIcon name="clock" /> Calendar
            </h1>
            <p className="w-oc-sub">Full economic calendar + token unlocks + protocol events.</p>
          </div>
          <div className="w-flow-radar-timeframe">
            {TIMEFRAMES.map((tf) => (
              <button key={tf} className={tf === timeframe ? 'on' : ''} onClick={() => setTimeframe(tf)}>
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-flow-radar-filters">
        <div className="w-flow-radar-chip-row">
          {TYPES.map((t) => (
            <button
              key={t.key}
              className={`w-flow-radar-chip${type === t.key ? ' on' : ''}`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="w-oc-asset-tabs">
          {ASSETS.map((a) => (
            <button key={a} className={a === asset ? 'on' : ''} onClick={() => setAsset(a)}>
              {a}
            </button>
          ))}
        </div>
        <div className="w-flow-radar-chip-row">
          {IMPACTS.map((imp) => (
            <button
              key={imp}
              className={`w-flow-radar-chip w-flow-radar-sev-${imp.toLowerCase()}${impacts.has(imp) ? ' on' : ''}`}
              onClick={() => toggleImpact(imp)}
            >
              {imp}
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' ? (
        <div className="w-panel-skeleton w-panel-skeleton-list" aria-busy="true" style={{ minHeight: 220 }} />
      ) : !data ? (
        <p className="w-panel-empty">Couldn&apos;t load the calendar right now.</p>
      ) : (
        <section className="w-apanel" aria-label="Calendar events">
          <div className="w-apanel-h">
            <span className="w-ttl">Upcoming &amp; recent</span>
            <span className="w-sub">{filtered.length} events · {timeframe}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="w-apanel-b">
              <p className="w-panel-empty">No events match these filters right now.</p>
            </div>
          ) : (
            <div className="w-radar-list">
              {filtered.map((event) => (
                <div key={event.id} className="w-radar-item">
                  <span className="w-cal-type-ic" aria-hidden="true">{TYPE_ICON[event.type]}</span>
                  <div className="w-radar-main">
                    <b>
                      {event.title} <span className={IMPACT_BADGE[event.impact]}>{event.impact}</span>
                    </b>
                    <div className="w-rsub">{event.description}</div>
                  </div>
                  <div className="w-radar-amt">
                    <b className="w-muted">{formatEventDate(event.ts)}</b>
                    <span>{event.assets.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {popupEvent && (
        <div className="w-cal-d1-overlay" role="dialog" aria-modal="true" aria-label="High-impact event tomorrow">
          <div className="w-cal-d1-modal">
            <div className="w-cal-d1-head">📅 High-impact event soon</div>
            <div className="w-cal-d1-title">{popupEvent.title}</div>
            <div className="w-cal-d1-when">{formatEventDate(popupEvent.ts)}</div>
            <p>{popupEvent.description}</p>
            <div className="w-cal-d1-assets">Affected: {popupEvent.assets.join(', ')}</div>
            <div className="w-cal-d1-actions">
              <button className="w-btn w-btn-ghost w-btn-sm" onClick={() => dismissPopup(popupEvent)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
