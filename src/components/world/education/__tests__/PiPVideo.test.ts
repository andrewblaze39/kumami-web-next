/**
 * Tests for the parseVideoUrl helper in PiPVideo.tsx (I6/I7).
 *
 * Covers: YouTube URL forms → embed conversion, Shorts → 9:16 auto-detect,
 * allowlist enforcement, direct video passthrough, invalid/non-http → invalid.
 */

import { describe, it, expect } from 'vitest';
import { parseVideoUrl } from '../PiPVideo';

// ---------------------------------------------------------------------------
// YouTube — watch URL
// ---------------------------------------------------------------------------

describe('parseVideoUrl — YouTube watch URLs', () => {
  it('converts youtube.com/watch?v= to nocookie embed', () => {
    const r = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(r.type).toBe('youtube');
    expect(r.embedSrc).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(r.detectedAspect).toBe('16:9');
  });

  it('accepts youtube.com (no www)', () => {
    const r = parseVideoUrl('https://youtube.com/watch?v=abc123');
    expect(r.type).toBe('youtube');
    expect(r.embedSrc).toBe('https://www.youtube-nocookie.com/embed/abc123');
  });
});

// ---------------------------------------------------------------------------
// YouTube — short URL (youtu.be)
// ---------------------------------------------------------------------------

describe('parseVideoUrl — youtu.be short URLs', () => {
  it('converts youtu.be/<id> to nocookie embed', () => {
    const r = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(r.type).toBe('youtube');
    expect(r.embedSrc).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('strips query params from youtu.be path', () => {
    const r = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ?t=42');
    expect(r.type).toBe('youtube');
    expect(r.embedSrc).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
});

// ---------------------------------------------------------------------------
// YouTube — embed URL passthrough
// ---------------------------------------------------------------------------

describe('parseVideoUrl — already-embed URLs', () => {
  it('passes through youtube.com/embed/<id>', () => {
    const r = parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(r.type).toBe('youtube');
    expect(r.embedSrc).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('passes through youtube-nocookie.com/embed/<id>', () => {
    const r = parseVideoUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(r.type).toBe('youtube');
    expect(r.embedSrc).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
});

// ---------------------------------------------------------------------------
// YouTube Shorts — 9:16 auto-detect (I7)
// ---------------------------------------------------------------------------

describe('parseVideoUrl — Shorts (9:16 auto-detect)', () => {
  it('converts shorts/<id> to embed and detects 9:16', () => {
    const r = parseVideoUrl('https://www.youtube.com/shorts/abc123');
    expect(r.type).toBe('youtube');
    expect(r.embedSrc).toBe('https://www.youtube-nocookie.com/embed/abc123');
    expect(r.detectedAspect).toBe('9:16');
  });

  it('strips query params from shorts path', () => {
    const r = parseVideoUrl('https://www.youtube.com/shorts/abc123?feature=share');
    expect(r.type).toBe('youtube');
    expect(r.embedSrc).toBe('https://www.youtube-nocookie.com/embed/abc123');
    expect(r.detectedAspect).toBe('9:16');
  });
});

// ---------------------------------------------------------------------------
// Direct video (non-YouTube https)
// ---------------------------------------------------------------------------

describe('parseVideoUrl — direct video URLs', () => {
  it('returns type=direct for non-YouTube https URL', () => {
    const r = parseVideoUrl('https://cdn.example.com/video.mp4');
    expect(r.type).toBe('direct');
    expect(r.embedSrc).toBeUndefined();
  });

  it('returns type=direct for http URLs', () => {
    const r = parseVideoUrl('http://cdn.example.com/video.mp4');
    expect(r.type).toBe('direct');
  });
});

// ---------------------------------------------------------------------------
// Invalid / blocked
// ---------------------------------------------------------------------------

describe('parseVideoUrl — invalid / non-http URLs', () => {
  it('returns type=invalid for javascript: scheme', () => {
    const r = parseVideoUrl('javascript:alert(1)');
    expect(r.type).toBe('invalid');
  });

  it('returns type=invalid for data: URI', () => {
    const r = parseVideoUrl('data:text/html,<h1>hi</h1>');
    expect(r.type).toBe('invalid');
  });

  it('returns type=invalid for a bare string (not a URL)', () => {
    const r = parseVideoUrl('not-a-url-at-all');
    expect(r.type).toBe('invalid');
  });

  it('returns type=invalid for youtube.com URL with no video id', () => {
    const r = parseVideoUrl('https://www.youtube.com/channel/UCxxxxxx');
    expect(r.type).toBe('invalid');
  });

  it('returns type=invalid for empty string', () => {
    const r = parseVideoUrl('');
    expect(r.type).toBe('invalid');
  });
});

// ---------------------------------------------------------------------------
// Allowlist — non-YouTube domains that look YouTube-ish are NOT allowed
// ---------------------------------------------------------------------------

describe('parseVideoUrl — allowlist enforcement', () => {
  it('does not allow a domain that contains "youtube" but is not in the allowlist', () => {
    const r = parseVideoUrl('https://malicious-youtube.com/watch?v=abc');
    // malicious-youtube.com is not in allowlist → direct (it's still http(s))
    expect(r.type).toBe('direct');
  });

  it('does not allow ftp: scheme', () => {
    const r = parseVideoUrl('ftp://youtube.com/watch?v=abc');
    expect(r.type).toBe('invalid');
  });
});
