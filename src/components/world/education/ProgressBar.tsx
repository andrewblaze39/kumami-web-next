'use client';

/**
 * ProgressBar — horizontal progress bar for the course detail header.
 */

interface ProgressBarProps {
  /** 0–100 */
  pct: number;
  /** Number of completed parts */
  completed: number;
  /** Total parts */
  total: number;
}

export default function ProgressBar({ pct, completed, total }: ProgressBarProps) {
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <div className="w-progress-bar-wrap">
      <div className="w-progress-bar-track">
        <div
          className="w-progress-bar-fill"
          style={{ width: `${clampedPct}%` }}
          role="progressbar"
          aria-valuenow={clampedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${clampedPct}% complete`}
        />
      </div>
      <div className="w-progress-bar-label">
        <span>
          {completed}/{total} parts completed
        </span>
        <span className="w-progress-pct">{clampedPct}%</span>
      </div>
    </div>
  );
}
