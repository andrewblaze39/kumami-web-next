/**
 * Is a user's Pro access active right now? (Andrew, 10 Oct 2026)
 *
 * Pro = users/{uid}.isPremium === true AND, if a superadmin granted Pro for a
 * fixed period (/admin/subscriptions), the end date `proUntil` hasn't passed.
 * There is no scheduled job: expiry is enforced wherever Pro is checked —
 * server (gating.resolveTier) and client (AuthContext normalises
 * userData.isPremium with this helper). Pure; safe on client and server.
 */

type TimestampLike = { toMillis(): number } | { seconds: number } | number | string | null | undefined;

export function toMillis(v: TimestampLike): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if ('toMillis' in v && typeof v.toMillis === 'function') return v.toMillis();
  if ('seconds' in v && typeof v.seconds === 'number') return v.seconds * 1000;
  return null;
}

export function isProActive(user: { isPremium?: unknown; proUntil?: TimestampLike } | null | undefined, now = Date.now()): boolean {
  if (!user || user.isPremium !== true) return false;
  const until = toMillis(user.proUntil);
  return until === null || until > now;
}
