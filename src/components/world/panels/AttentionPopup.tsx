'use client';

/**
 * "Needs your attention today" — fires on Console load when a HIGH-impact
 * Calendar event lands inside the next 24h. Same underlying event/impact
 * data as the standalone Calendar page's D-1 popup, but surfaces every
 * qualifying event as a list (not just the first one) and lives on Console,
 * since that's where users land first.
 *
 * Scoping note: Rachelle's mockup for this popup also shows an airdrop
 * whitelist deadline item ("you are eligible"). That's not built here — the
 * Airdrops feature has no per-user eligibility computation (just an
 * admin-set global flag), so a per-user "you are eligible" claim would be
 * fabricated. This ships with real Calendar data only until that exists.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CalendarPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from './useMarketEndpoint';
import { WIcon } from './console-ui';
import { isAttentionEligible } from '@/lib/market/rules/calendarEvents';

const DISMISSED_KEY = 'kumami_console_attention_dismissed';
const WINDOW_MS = 24 * 3_600_000;
/** Upcoming HIGH macro prints can cluster (CPI + jobless claims + …) — keep the popup scannable. */
const MAX_ITEMS = 5;

function timeUntilLabel(ts: string): string {
  const hours = (Date.parse(ts) - Date.now()) / 3_600_000;
  if (hours < 24) return `In ${Math.max(1, Math.round(hours))}h`;
  return 'Tomorrow';
}

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export default function AttentionPopup() {
  const { data } = useMarketEndpoint<CalendarPayload>('/api/market/calendar');
  // null until the client-only localStorage read resolves (avoids an SSR mismatch).
  const [dismissedIds, setDismissedIds] = useState<string[] | null>(null);
  useEffect(() => { setDismissedIds(readDismissed()); }, []);

  const items = useMemo(() => {
    if (!data || dismissedIds === null) return [];
    const now = Date.now();
    return data.events
      .filter((e) => {
        const dt = Date.parse(e.ts) - now;
        return isAttentionEligible(e) && dt > 0 && dt <= WINDOW_MS && !dismissedIds.includes(e.id);
      })
      .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
      .slice(0, MAX_ITEMS);
  }, [data, dismissedIds]);

  const dismiss = () => {
    const next = [...(dismissedIds ?? []), ...items.map((e) => e.id)];
    setDismissedIds(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch { /* ignore storage errors */ }
  };

  if (items.length === 0) return null;

  return (
    <div className="w-cal-d1-overlay" role="dialog" aria-modal="true" aria-label="Needs your attention today">
      <div className="w-attn-modal">
        <div className="w-attn-head">
          <span className="w-attn-icon"><WIcon name="bell" /></span>
          <div className="w-attn-headtext">
            <div className="w-attn-title">
              Needs your attention today <span className="w-attn-count">{items.length} ITEM{items.length === 1 ? '' : 'S'}</span>
            </div>
            <p className="w-attn-sub">
              {items.length === 1
                ? 'One high-impact event lands inside the next 24 hours.'
                : `${items.length} high-impact events land inside the next 24 hours.`}
            </p>
          </div>
          <button className="w-attn-close" aria-label="Close" onClick={dismiss}>×</button>
        </div>

        <div className="w-attn-list">
          {items.map((event) => (
            <div key={event.id} className="w-attn-item">
              <span className="w-attn-tag">CALENDAR</span>
              <span className="w-attn-item-title">{event.title}</span>
              <span className="w-attn-when">{timeUntilLabel(event.ts)}</span>
            </div>
          ))}
        </div>

        <div className="w-attn-actions">
          <button className="w-btn w-btn-ghost w-btn-sm" onClick={dismiss}>
            Remind me later
          </button>
          <Link href="/world/calendar" className="w-btn w-btn-pro w-btn-sm" onClick={dismiss}>
            Open Calendar <WIcon name="arrowR" />
          </Link>
        </div>
      </div>
    </div>
  );
}
