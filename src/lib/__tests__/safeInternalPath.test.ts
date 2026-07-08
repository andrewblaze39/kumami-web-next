import { describe, it, expect } from 'vitest';
import { isSafeInternalPath } from '../safeInternalPath';

describe('isSafeInternalPath', () => {
  // ── Accepted paths ──────────────────────────────────────────────────────────
  it('accepts a normal internal path', () => {
    expect(isSafeInternalPath('/world/pro')).toBe(true);
  });

  it('accepts a root slash', () => {
    expect(isSafeInternalPath('/')).toBe(true);
  });

  it('accepts a path with query string', () => {
    expect(isSafeInternalPath('/world/news?tab=all')).toBe(true);
  });

  // ── Rejected paths ──────────────────────────────────────────────────────────
  it('rejects protocol-relative URL //evil.com', () => {
    expect(isSafeInternalPath('//evil.com')).toBe(false);
  });

  it('rejects backslash-normalised variant /\\evil.com', () => {
    expect(isSafeInternalPath('/\\evil.com')).toBe(false);
  });

  it('rejects absolute https URL', () => {
    expect(isSafeInternalPath('https://evil.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isSafeInternalPath('')).toBe(false);
  });

  it('rejects null', () => {
    expect(isSafeInternalPath(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isSafeInternalPath(undefined)).toBe(false);
  });

  it('rejects a bare domain with no leading slash', () => {
    expect(isSafeInternalPath('evil.com')).toBe(false);
  });
});
