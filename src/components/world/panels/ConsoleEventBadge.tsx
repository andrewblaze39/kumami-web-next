'use client';

/**
 * Console badge (Rachelle v1.15 Plus §1.5, from Calendar §7.4): a team-added
 * HIGH event starting within 6h shows at the top of the Console —
 * "CPI in 4h — expect volatility". Same Calendar feed as the attention popup;
 * the countdown re-renders every minute and the badge disappears when the
 * event starts.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CalendarPayload } from '@/lib/market/contracts';
import { useMarketEndpoint } from './useMarketEndpoint';
import { WIcon } from './console-ui';
import { badgeCountdown, consoleBadgeEvents } from '@/lib/market/rules/calendarEvents';

export default function ConsoleEventBadge() {
  const { data } = useMarketEndpoint<CalendarPayload>('/api/market/calendar');
  // null on the server render; set on mount so the countdown never mismatches.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  if (!data || now === null) return null;
  const events = consoleBadgeEvents(data.events, now);
  if (events.length === 0) return null;
  const [next, ...rest] = events;

  return (
    <Link href="/world/calendar" className="w-console-event-badge" role="status">
      <WIcon name="bell" />
      <span>
        <b>{next.title}</b> {badgeCountdown(next.ts, now)} — expect volatility
      </span>
      {rest.length > 0 && <span className="w-console-event-more">+{rest.length} more</span>}
    </Link>
  );
}
