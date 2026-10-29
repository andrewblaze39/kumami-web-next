'use client';

/**
 * /world/calendar — Calendar Plus, for every signed-in account (Pro users too). Calendar Pro
 * (same UI + Pro-only events, airdrop claim days and token unlocks) is the Pro tab
 * /world/pro?tab=calendar. Both render components/world/calendar/CalendarView.
 */

import { CalendarView } from '@/components/world/calendar/CalendarView';

export default function CalendarPage() {
  return <CalendarView view="plus" />;
}
