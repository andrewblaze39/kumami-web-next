'use client';

/**
 * AchievementBadges — 5 phase completion badges for the learner dashboard.
 *
 * Each badge is earned when the user completes all lessons in a phase
 * (completedParts.length >= totalParts). Unearned badges are greyed/locked.
 *
 * Badge designs are SVG medallions using world design tokens.
 * Each has a unique accent colour matching the phase level:
 *   Phase 1 (Beginner)     — green   (#5ee9a8  accent)
 *   Phase 2 (Elementary)   — teal    (#56dfe6  accent2)
 *   Phase 3 (Intermediate) — purple  (#b9a4ff  purple)
 *   Phase 4 (Advanced)     — gold    (#f0cd7e  gold)
 *   Phase 5 (Expert)       — red-ish (#ff9a6c  warm orange)
 */

import type { CourseProgress } from '@/lib/education/progress';
import { JOURNEY_PHASES } from '@/lib/education/journeyData';

interface AchievementBadgesProps {
  progress: CourseProgress[];
}

// Badge colours per phase index
const BADGE_COLOURS = ['#5ee9a8', '#56dfe6', '#b9a4ff', '#f0cd7e', '#ff9a6c'];

// Inner icon paths (simple geometric) per phase
function BadgeIcon({ phase, earned }: { phase: number; earned: boolean }) {
  const color = earned ? BADGE_COLOURS[phase - 1] : 'var(--muted-2)';
  const bg = earned
    ? `color-mix(in srgb, ${BADGE_COLOURS[phase - 1]} 14%, transparent)`
    : 'rgba(255,255,255,0.03)';

  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className="w-badge-svg"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle
        cx="32"
        cy="32"
        r="30"
        fill={bg}
        stroke={color}
        strokeWidth={earned ? 2 : 1.5}
        strokeDasharray={earned ? 'none' : '4 3'}
        opacity={earned ? 1 : 0.5}
      />
      {/* Phase-specific inner icon */}
      {phase === 1 && (
        /* Star / first step */
        <path
          d="M32 14 l4 12h12l-9.7 7 3.7 12L32 38l-10 7 3.7-12L16 26h12z"
          fill={earned ? color : 'none'}
          stroke={color}
          strokeWidth="1.5"
          opacity={earned ? 0.95 : 0.4}
        />
      )}
      {phase === 2 && (
        /* Blockchain link symbol */
        <g stroke={color} strokeWidth="2" fill="none" opacity={earned ? 0.95 : 0.4}>
          <rect x="18" y="26" width="12" height="12" rx="3" fill={earned ? color : 'none'} fillOpacity="0.2" />
          <rect x="34" y="26" width="12" height="12" rx="3" fill={earned ? color : 'none'} fillOpacity="0.2" />
          <line x1="30" y1="32" x2="34" y2="32" />
          <line x1="24" y1="20" x2="24" y2="26" />
          <line x1="40" y1="38" x2="40" y2="44" />
        </g>
      )}
      {phase === 3 && (
        /* Candlestick chart */
        <g stroke={color} strokeWidth="2.2" fill={earned ? color : 'none'} strokeLinecap="round" opacity={earned ? 0.95 : 0.4}>
          <line x1="22" y1="16" x2="22" y2="48" />
          <rect x="19" y="26" width="6" height="10" rx="1.5" />
          <line x1="32" y1="20" x2="32" y2="48" />
          <rect x="29" y="30" width="6" height="12" rx="1.5" />
          <line x1="42" y1="18" x2="42" y2="44" />
          <rect x="39" y="22" width="6" height="8" rx="1.5" />
        </g>
      )}
      {phase === 4 && (
        /* Diamond / gem — investor */
        <g opacity={earned ? 0.95 : 0.4}>
          <polygon
            points="32,14 46,26 32,50 18,26"
            fill={earned ? color : 'none'}
            fillOpacity="0.22"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <polygon
            points="32,14 46,26 32,32 18,26"
            fill={earned ? color : 'none'}
            fillOpacity="0.4"
            stroke={color}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </g>
      )}
      {phase === 5 && (
        /* Rocket / Web3 Pro */
        <g stroke={color} strokeWidth="1.8" fill={earned ? color : 'none'} strokeLinecap="round" strokeLinejoin="round" opacity={earned ? 0.95 : 0.4}>
          <path d="M32 16 c6 2 10 8 10 14 v10 l-4 4 -6-4 -6 4 -4-4 v-10 c0-6 4-12 10-14z" fillOpacity={earned ? 0.25 : 0} />
          <ellipse cx="32" cy="30" rx="4" ry="5" />
          <path d="M22 38 c-3 2 -5 6 -4 8 2-1 6-3 8-6" fillOpacity={earned ? 0.35 : 0} />
          <path d="M42 38 c3 2 5 6 4 8 -2-1 -6-3 -8-6" fillOpacity={earned ? 0.35 : 0} />
        </g>
      )}
      {/* Lock overlay when not earned */}
      {!earned && (
        <g opacity="0.4" stroke="var(--muted-2)" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <rect x="27" y="32" width="10" height="8" rx="2" />
          <path d="M29 32v-2.5a3 3 0 0 1 6 0V32" />
        </g>
      )}
    </svg>
  );
}

export default function AchievementBadges({ progress }: AchievementBadgesProps) {
  const progressMap: Record<string, CourseProgress> = {};
  for (const cp of progress) {
    progressMap[cp.courseId] = cp;
  }

  return (
    <div className="w-badge-grid">
      {JOURNEY_PHASES.map((phase) => {
        const cp = progressMap[phase.courseId];
        const earned = !!cp && cp.totalParts > 0 && cp.completedParts.length >= cp.totalParts;

        return (
          <div
            key={phase.courseId}
            className={`w-badge-item${earned ? ' earned' : ''}`}
            title={earned ? `${phase.badgeLabel} — earned!` : `Complete ${phase.title} to earn this badge`}
          >
            <BadgeIcon phase={phase.phase} earned={earned} />
            <span className="w-badge-label">{phase.badgeLabel}</span>
            <span className="w-badge-sublabel">{phase.level}</span>
          </div>
        );
      })}
    </div>
  );
}
