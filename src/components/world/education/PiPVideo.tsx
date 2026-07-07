'use client';

/**
 * PiPVideo — Embeds a video (YouTube iframe or direct <video>) and activates a
 * fixed Picture-in-Picture mini-player when the video scrolls out of view.
 *
 * PiP strategy: sentinel + inner wrapper CSS class swap.
 *   - An outer "sentinel" div always stays in normal document flow, preserving layout.
 *     The sentinel has an aspect-ratio so it holds its space (no layout shift).
 *   - We observe the SENTINEL; when it leaves the viewport we add .w-pip-active to the
 *     inner wrapper. The inner wrapper is what becomes position:fixed.
 *   - The media element (iframe/<video>) sits inside the inner wrapper and never
 *     remounts, so playback is never interrupted.
 *
 * PiP activation note for iframes (YouTube):
 *   IntersectionObserver cannot reliably detect whether a YouTube iframe is currently
 *   playing — cross-origin restrictions prevent reading playback state. Therefore, PiP
 *   activates on scroll-out regardless of playback state. This is acceptable UX because
 *   the mini player is small and has a close button.
 *
 * For direct <video> elements we additionally listen to the `play` / `pause` events
 * to only activate PiP while the video is actually playing.
 *
 * URL handling (I6):
 *   - youtube.com / youtu.be / www.youtube.com / youtube-nocookie.com / youtu.be →
 *     converted to https://www.youtube-nocookie.com/embed/<id>
 *   - shorts/<id> → embed + 9:16 aspect (auto)
 *   - Non-YouTube http(s) → <video>
 *   - Invalid / other scheme → render nothing
 */

import { useRef, useEffect, useState, useCallback } from 'react';

const NOTE_CAP = 5000; // kept here for reference; cap is enforced in textarea maxLength

interface PiPVideoProps {
  /** Full YouTube URL or direct video file URL */
  src: string;
  /** Title for accessibility */
  title: string;
  /** Explicit aspect ratio override. Auto-detected for Shorts URLs if absent. */
  aspect?: '16:9' | '9:16';
  className?: string;
}

// ---------- URL parsing helpers (I6) ----------

interface ParsedVideo {
  type: 'youtube' | 'direct' | 'invalid';
  /** Embed URL (youtube only) */
  embedSrc?: string;
  /** Auto-detected aspect from URL (Shorts → 9:16) */
  detectedAspect?: '16:9' | '9:16';
}

const YT_HOSTNAMES = new Set([
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'www.youtu.be',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
]);

function parseVideoUrl(raw: string): ParsedVideo {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { type: 'invalid' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { type: 'invalid' };
  }

  const hostname = url.hostname.toLowerCase();

  if (!YT_HOSTNAMES.has(hostname)) {
    // Non-YouTube — treat as direct video
    return { type: 'direct' };
  }

  // ---- YouTube ----
  const path = url.pathname; // e.g. /watch, /embed/abc, /shorts/abc, /abc (youtu.be)

  let videoId: string | null = null;
  let detectedAspect: '16:9' | '9:16' = '16:9';

  if (path.startsWith('/embed/')) {
    // Already embed
    videoId = path.slice('/embed/'.length).split('/')[0].split('?')[0];
  } else if (path.startsWith('/shorts/')) {
    videoId = path.slice('/shorts/'.length).split('/')[0].split('?')[0];
    detectedAspect = '9:16';
  } else if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
    // youtu.be/<id>
    videoId = path.slice(1).split('/')[0].split('?')[0];
  } else {
    // youtube.com/watch?v=<id>
    videoId = url.searchParams.get('v');
  }

  if (!videoId) return { type: 'invalid' };

  return {
    type: 'youtube',
    embedSrc: `https://www.youtube-nocookie.com/embed/${videoId}`,
    detectedAspect,
  };
}

export default function PiPVideo({ src, title, aspect, className }: PiPVideoProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // PiP state
  const [pipActive, setPipActive] = useState(false);
  const [pipClosed, setPipClosed] = useState(false);

  // For direct <video>: only activate PiP while playing
  const [playing, setPlaying] = useState(false);

  const parsed = parseVideoUrl(src);
  const isYT = parsed.type === 'youtube';
  const isValid = parsed.type !== 'invalid';

  // Aspect: explicit prop wins, then auto-detected from URL, then 16:9 default
  const resolvedAspect: '16:9' | '9:16' = aspect ?? parsed.detectedAspect ?? '16:9';
  const aspectClass = resolvedAspect === '9:16' ? 'w-video-aspect-916' : 'w-video-aspect-169';

  // C1 FIX: Observe the SENTINEL (always in flow), not the inner wrapper.
  // The sentinel stays put regardless of pip state, so no oscillation.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const outOfView = !entry.isIntersecting;
        if (outOfView && !pipClosed) {
          if (isYT || playing) {
            setPipActive(true);
          }
        } else {
          setPipActive(false);
          setPipClosed(false);
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isYT, playing, pipClosed]);

  // Track play/pause for direct <video>
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      setPipActive(false);
    };
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    return () => {
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
    };
  }, []);

  const closePiP = useCallback(() => {
    setPipActive(false);
    setPipClosed(true);
  }, []);

  if (!isValid) return null;

  return (
    /*
     * SENTINEL — always in document flow.
     * Holds space via aspect-ratio so no layout shift when inner wrapper goes fixed.
     * We observe THIS element, not the inner wrapper.
     */
    <div
      ref={sentinelRef}
      className={['w-pip-sentinel', aspectClass, className ?? ''].filter(Boolean).join(' ')}
      aria-hidden={pipActive}
    >
      {/*
       * INNER WRAPPER — gets .w-pip-active for the fixed position CSS.
       * Never remounts; media element inside is untouched.
       */}
      <div
        className={[
          'w-pip-wrapper',
          aspectClass,
          pipActive ? 'w-pip-active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {pipActive && (
          <button
            className="w-pip-close"
            onClick={closePiP}
            aria-label="Close mini player"
            title="Close mini player"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {isYT ? (
          <iframe
            src={parsed.embedSrc!}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-video-frame"
          />
        ) : (
          <video
            ref={videoRef}
            src={src}
            title={title}
            controls
            className="w-video-frame"
            playsInline
          />
        )}
      </div>
    </div>
  );
}

// Export for test access
export { parseVideoUrl };
export type { ParsedVideo };
// NOTE_CAP export for client-side defensive slicing
export { NOTE_CAP };
