'use client';

import { useEffect, useRef } from 'react';
import { useWorldMode, WorldMode } from '@/contexts/WorldModeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ModeToggle() {
  const { mode, setMode } = useWorldMode();
  const { userData } = useAuth();
  const isPremium = userData?.isPremium === true;
  const knobRef = useRef<HTMLSpanElement>(null);
  const switchRef = useRef<HTMLDivElement>(null);

  // Position the sliding knob to match the active button
  function positionKnob() {
    if (!switchRef.current || !knobRef.current) return;
    const active = switchRef.current.querySelector<HTMLButtonElement>('button.w-mode-on');
    if (!active) return;
    knobRef.current.style.left = `${active.offsetLeft}px`;
    knobRef.current.style.width = `${active.offsetWidth}px`;
  }

  useEffect(() => {
    positionKnob();
    const raf = requestAnimationFrame(() => requestAnimationFrame(positionKnob));
    const t = setTimeout(positionKnob, 90);
    window.addEventListener('resize', positionKnob);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', positionKnob);
    };
  }, [mode]);

  const cls = (m: WorldMode) => {
    if (m !== mode) return '';
    if (m === 'advanced') return 'w-mode-on w-mode-adv-on';
    if (m === 'pro') return 'w-mode-on w-mode-pro-on';
    return 'w-mode-on';
  };

  const modeClass = mode === 'advanced' ? 'w-mode-switch is-adv' : mode === 'pro' ? 'w-mode-switch is-pro' : 'w-mode-switch';

  return (
    <div className={modeClass} ref={switchRef}>
      <span className="w-knob" ref={knobRef} />
      <button className={cls('beginner')} onClick={() => setMode('beginner')}>
        <span>Beginner</span>
      </button>
      <button className={cls('advanced')} onClick={() => setMode('advanced')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3 2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.8 6.6 19.4l1.2-6L3.3 9.3l6.1-.7Z" />
        </svg>
        <span>Advanced</span>
      </button>
      <button className={cls('pro')} onClick={() => setMode('pro')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 3 5 13h5l-1 8 8-10h-5Z" />
        </svg>
        <span>Pro</span>
        {!isPremium && (
          <svg className="w-lock-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </svg>
        )}
      </button>
    </div>
  );
}
