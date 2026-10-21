import { timingSafeEqual } from 'node:crypto';

/** Constant-time check of the Cloud Scheduler shared secret (x-cron-secret header). */
export function secretMatches(given: string | null, expected: string): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
