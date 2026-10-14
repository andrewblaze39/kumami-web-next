/**
 * Cookie consent. Kumami's only non-essential tracker is Firebase (Google)
 * Analytics, so consent is a single yes/no for analytics. Sign-in, the saved
 * Beginner/Advanced/Pro mode and redirect bookkeeping are strictly necessary
 * and never asked about.
 *
 * The choice is kept in localStorage. Bump CONSENT_VERSION when the Privacy
 * Policy changes what analytics collects, so everyone is asked again.
 */

export const CONSENT_STORAGE_KEY = 'kumami_cookie_consent';
export const CONSENT_VERSION = 1;
/** Fired on window when the choice changes, and to reopen the banner. */
export const CONSENT_CHANGED_EVENT = 'kumami:consent-changed';
export const CONSENT_OPEN_EVENT = 'kumami:consent-open';

export interface ConsentChoice {
  analytics: boolean;
  version: number;
  /** ISO time the choice was made, kept as a record of consent. */
  decidedAt: string;
}

/** Parse a stored value. Anything unreadable or from an older version counts as "not asked yet". */
export function parseConsent(raw: string | null | undefined): ConsentChoice | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ConsentChoice>;
    if (typeof v?.analytics !== 'boolean' || v.version !== CONSENT_VERSION || typeof v.decidedAt !== 'string') {
      return null;
    }
    return { analytics: v.analytics, version: v.version, decidedAt: v.decidedAt };
  } catch {
    return null;
  }
}

export function makeConsent(analytics: boolean, now: Date = new Date()): ConsentChoice {
  return { analytics, version: CONSENT_VERSION, decidedAt: now.toISOString() };
}

export function readConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean): ConsentChoice {
  const choice = makeConsent(analytics);
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Storage blocked (private window): the choice still applies to this visit.
  }
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_CHANGED_EVENT, { detail: choice }));
  return choice;
}

/** True only after an explicit "Accept". No choice yet means no analytics. */
export function analyticsAllowed(choice: ConsentChoice | null): boolean {
  return choice?.analytics === true;
}

/** Google Analytics cookie names (_ga, _ga_<id>, _gid) to clear when consent is withdrawn. */
export function analyticsCookieNames(cookieHeader: string): string[] {
  return cookieHeader
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((name) => name === '_ga' || name === '_gid' || name.startsWith('_ga_'));
}

/** Reopen the cookie banner (footer "Cookie settings" links). */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
