'use client';

/**
 * PiPVideo — Embeds a video (YouTube iframe or direct <video>) and activates a
 * fixed Picture-in-Picture mini-player when the video scrolls out of view.
 *
 * PiP strategy: CSS-only class swap on the same element.
 *   - No clone/move: the same DOM node stays mounted so playback is never interrupted.
 *   - We toggle a `.w-pip-active` class on the wrapper div; CSS makes it fixed-position
 *     in the bottom-right corner.
 *   - Works for both iframes and <video> elements without touching the media element itself.
 *
 * PiP activation note for iframes (YouTube):
 *   IntersectionObserver cannot reliably detect whether a YouTube iframe is currently
 *   playing — cross-origin restrictions prevent reading playback state. Therefore, PiP
 *   activates on scroll-out regardless of playback state. This is acceptable UX because
 *   the mini player is small and has a close button. If the user isn't playing yet, the
 *   mini player will simply show a paused frame.
 *
 * For direct <video> elements, we additionally listen to the `play` / `pause` events
 * to only activate PiP while the video is actually playing.
 */

import { useRef, useEffect, useState, useCallback } from 'react';

interface PiPVideoProps {
  /** Full YouTube URL or direct video file URL */
  src: string;
  /** Title for accessibility */
  title: string;
  /** Aspect ratio hint — auto-detected from the URL if possible */
  aspect?: '16:9' | '9:16';
  className?: string;
}

/** Detect if the URL is a YouTube link. */
function isYouTubeUrl(url: string): boolean {
  return /youtu(be\.com|\.be)/i.test(url);
}

/** Convert a YouTube watch URL to its embed form. */
function toYouTubeEmbed(url: string): string {
  // Already an embed URL
  if (url.includes('youtube.com/embed/')) return url;
  // youtu.be/<id>
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  // youtube.com/watch?v=<id>
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  return url;
}

export default function PiPVideo({ src, title, aspect = '16:9', className }: PiPVideoProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // PiP state
  const [pipActive, setPipActive] = useState(false);
  const [pipClosed, setPipClosed] = useState(false);

  // For direct <video>: only activate PiP while playing
  const [playing, setPlaying] = useState(false);

  const isYT = isYouTubeUrl(src);
  const embedSrc = isYT ? toYouTubeEmbed(src) : null;

  // Observe scroll-out on the wrapper
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const outOfView = !entry.isIntersecting;
        if (outOfView && !pipClosed) {
          // For iframes: activate regardless (can't detect play state cross-origin).
          // For direct videos: only activate if playing.
          if (isYT || playing) {
            setPipActive(true);
          }
        } else {
          // Back in view → restore and un-close
          setPipActive(false);
          setPipClosed(false);
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
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

  const aspectClass = aspect === '9:16' ? 'w-video-aspect-916' : 'w-video-aspect-169';

  return (
    <div
      ref={wrapperRef}
      className={[
        'w-pip-wrapper',
        aspectClass,
        pipActive ? 'w-pip-active' : '',
        className ?? '',
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
          src={embedSrc!}
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
  );
}
