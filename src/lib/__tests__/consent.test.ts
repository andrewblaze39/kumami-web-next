import { describe, expect, it } from 'vitest';
import {
  CONSENT_VERSION,
  analyticsAllowed,
  analyticsCookieNames,
  makeConsent,
  parseConsent,
} from '../consent';

describe('parseConsent', () => {
  it('reads a stored choice', () => {
    const c = makeConsent(true, new Date('2026-10-14T00:00:00Z'));
    expect(parseConsent(JSON.stringify(c))).toEqual({
      analytics: true,
      version: CONSENT_VERSION,
      decidedAt: '2026-10-14T00:00:00.000Z',
    });
  });

  it('treats missing, broken or old-version values as not asked yet', () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent('')).toBeNull();
    expect(parseConsent('not json')).toBeNull();
    expect(parseConsent(JSON.stringify({ analytics: 'yes', version: CONSENT_VERSION, decidedAt: 'x' }))).toBeNull();
    expect(parseConsent(JSON.stringify({ analytics: true, version: CONSENT_VERSION - 1, decidedAt: 'x' }))).toBeNull();
  });
});

describe('analyticsAllowed', () => {
  it('is on only after an explicit accept', () => {
    expect(analyticsAllowed(null)).toBe(false);
    expect(analyticsAllowed(makeConsent(false))).toBe(false);
    expect(analyticsAllowed(makeConsent(true))).toBe(true);
  });
});

describe('analyticsCookieNames', () => {
  it('picks out only Google Analytics cookies', () => {
    expect(analyticsCookieNames('_ga=GA1.1; foo=1; _ga_ABC123=GS1; _gid=x; __session=y')).toEqual([
      '_ga',
      '_ga_ABC123',
      '_gid',
    ]);
    expect(analyticsCookieNames('')).toEqual([]);
  });
});
