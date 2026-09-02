'use client';

/**
 * ProductTour — a lightweight guided walkthrough that dims the page, spotlights
 * one target element at a time, and floats an explanation bubble with
 * Back / Next controls. No dependencies; targets are matched by CSS selector
 * (steps without a selector render as a centred welcome/finish card).
 *
 * Render conditionally (`{open && <ProductTour …/>}`) so it mounts fresh at
 * step 0. The shell scrolls inside `.w-main`, so each step scrolls its target
 * into view there and re-measures on scroll/resize. The bubble is measured and
 * clamped to the viewport so it never clips, and glides between steps.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './ProductTour.css';

export type TourStep = {
  /** CSS selector for the element to spotlight. Omit for a centred card. */
  selector?: string;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };
type Pos = { top: number; left: number };

const PAD = 8; // spotlight breathing room around the target
const GAP = 14; // distance between spotlight and bubble
const BUBBLE_W = 340;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

export default function ProductTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const step = steps[i];

  const measure = useCallback(() => {
    const sel = steps[i]?.selector;
    const el = sel ? (document.querySelector(sel) as HTMLElement | null) : null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [i, steps]);

  // Scroll the current target into view, then measure (after layout settles).
  useEffect(() => {
    const sel = steps[i]?.selector;
    const el = sel ? (document.querySelector(sel) as HTMLElement | null) : null;
    el?.scrollIntoView({ block: 'center', behavior: 'auto' });
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    return () => cancelAnimationFrame(raf);
  }, [i, steps, measure]);

  // Keep the spotlight aligned on scroll / resize.
  useEffect(() => {
    const onChange = () => measure();
    window.addEventListener('resize', onChange);
    const scroller = document.querySelector('.w-main');
    scroller?.addEventListener('scroll', onChange, { passive: true });
    return () => {
      window.removeEventListener('resize', onChange);
      scroller?.removeEventListener('scroll', onChange);
    };
  }, [measure]);

  // Place the bubble using the target rect + the bubble's measured height, so it
  // never clips and always stays fully on screen. Runs before paint (no flash).
  useLayoutEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bw = Math.min(BUBBLE_W, vw - 24);
    const bh = bubbleRef.current?.offsetHeight ?? 210;

    if (!rect) {
      setPos({ top: clamp((vh - bh) / 2, 12, vh - bh - 12), left: clamp((vw - bw) / 2, 12, vw - bw - 12) });
      return;
    }
    const left = clamp(rect.left + rect.width / 2 - bw / 2, 12, vw - bw - 12);
    const spaceBelow = vh - (rect.top + rect.height) - PAD - GAP;
    const spaceAbove = rect.top - PAD - GAP;
    let top: number;
    if (spaceBelow >= bh + 8) top = rect.top + rect.height + PAD + GAP;
    else if (spaceAbove >= bh + 8) top = rect.top - PAD - GAP - bh;
    else top = clamp(vh - bh - 16, 12, vh - bh - 12); // pin fully-visible near the bottom
    setPos({ top, left });
  }, [rect, i]);

  const goNext = useCallback(() => {
    if (i >= steps.length - 1) onClose();
    else setI(i + 1);
  }, [i, steps.length, onClose]);

  const goBack = useCallback(() => setI((c) => Math.max(0, c - 1)), []);

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      else if (e.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, goBack]);

  if (!step) return null;

  const isLast = i === steps.length - 1;
  const bubbleW = Math.min(BUBBLE_W, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 24);

  return (
    <div className="w-tour" role="dialog" aria-modal="true" aria-label="Guided tour">
      <div className="w-tour-blocker" onClick={(e) => e.stopPropagation()} />

      {rect && (
        <div
          className="w-tour-spot"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      )}

      <div
        ref={bubbleRef}
        className="w-tour-bubble"
        style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: bubbleW, opacity: pos ? 1 : 0 }}
      >
        <div className="w-tour-step">
          Step {i + 1} of {steps.length}
        </div>
        <h3 className="w-tour-title">{step.title}</h3>
        <p className="w-tour-body">{step.body}</p>

        <div className="w-tour-dots" aria-hidden="true">
          {steps.map((_, n) => (
            <span key={n} className={`w-tour-dot${n === i ? ' on' : ''}`} />
          ))}
        </div>

        <div className="w-tour-actions">
          <button type="button" className="w-tour-skip" onClick={onClose}>
            Skip
          </button>
          <div className="w-tour-nav">
            {i > 0 && (
              <button type="button" className="w-tour-btn ghost" onClick={goBack}>
                Back
              </button>
            )}
            <button type="button" className="w-tour-btn primary" onClick={goNext}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
