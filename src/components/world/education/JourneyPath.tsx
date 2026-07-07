'use client';

/**
 * JourneyPath — the 5-phase numbered learning path shown on the Courses page.
 *
 * Design decisions:
 * - Phase descriptions are VISIBLE BY DEFAULT (PM doc: hover-to-peek is a
 *   discoverability trap). Hover/tap may EXPAND the lesson list, but the
 *   tagline and metadata are always shown.
 * - Each node shows: phase number, title, tagline, "N lessons · ~Xh · earns a badge".
 * - A progress ring appears once a phase has been started (completedParts > 0).
 * - Clicking a node navigates to /world/courses/[courseId].
 * - The active / next / locked state is derived from completedParts counts.
 */

import { useState } from 'react';
import Link from 'next/link';
import { JOURNEY_PHASES } from '@/lib/education/journeyData';
import type { CourseProgress } from '@/lib/education/progress';

// ---------- Types ----------

interface JourneyPathProps {
  /** Per-phase progress from the /api/education/progress endpoint. May be empty before data loads. */
  progress: CourseProgress[];
}

// ---------- Sub-components ----------

interface ProgressRingProps {
  /** 0–100 */
  pct: number;
  size?: number;
}

function ProgressRing({ pct, size = 48 }: ProgressRingProps) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="w-journey-ring"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border-2)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="var(--accent)"
      >
        {pct}%
      </text>
    </svg>
  );
}

// ---------- Main component ----------

export default function JourneyPath({ progress }: JourneyPathProps) {
  // Track which phase nodes have their lesson list expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const progressMap: Record<string, CourseProgress> = {};
  for (const cp of progress) {
    progressMap[cp.courseId] = cp;
  }

  return (
    <div className="w-journey">
      {JOURNEY_PHASES.map((phase, idx) => {
        const cp = progressMap[phase.courseId];
        const completed = cp?.completedParts.length ?? 0;
        const total = cp?.totalParts ?? phase.lessons.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const isStarted = completed > 0;
        const isDone = pct === 100;
        const isExpanded = !!expanded[phase.courseId];

        // State badge
        const stateClass = isDone
          ? 'done'
          : isStarted
          ? 'in-progress'
          : idx === 0 || progressMap[JOURNEY_PHASES[idx - 1]?.courseId]?.completedParts.length === JOURNEY_PHASES[idx - 1]?.lessons.length
          ? 'next'
          : 'locked';

        return (
          <div key={phase.courseId} className={`w-journey-item ${stateClass}`}>
            {/* Connector line (skip for last) */}
            {idx < JOURNEY_PHASES.length - 1 && (
              <div className="w-journey-connector" aria-hidden="true" />
            )}

            <div className="w-journey-node">
              {/* Left: phase number / progress ring */}
              <div className="w-journey-num-wrap">
                {isStarted ? (
                  <ProgressRing pct={pct} size={48} />
                ) : (
                  <div className="w-journey-num">{phase.phase}</div>
                )}
              </div>

              {/* Main content */}
              <div className="w-journey-body">
                <div className="w-journey-header">
                  <div className="w-journey-meta-row">
                    <span className="w-journey-level">{phase.level}</span>
                    {isDone && <span className="w-journey-badge-pill">Badge earned</span>}
                  </div>

                  <Link href={`/world/courses/${phase.courseId}`} className="w-journey-title-link">
                    <h3 className="w-journey-phase-title">
                      <span className="w-journey-phase-num">{phase.phase}.</span>{' '}
                      {phase.title}
                    </h3>
                  </Link>

                  <p className="w-journey-tagline">{phase.tagline}</p>

                  <div className="w-journey-stats">
                    <span>{phase.lessons.length} lessons</span>
                    <span className="w-journey-dot" aria-hidden="true">·</span>
                    <span>~{phase.approxHours}h</span>
                    <span className="w-journey-dot" aria-hidden="true">·</span>
                    <span>earns a badge</span>
                    {isStarted && !isDone && (
                      <>
                        <span className="w-journey-dot" aria-hidden="true">·</span>
                        <span className="w-journey-progress-label">
                          {completed}/{total} parts done
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Expand / collapse lesson list */}
                <button
                  className="w-journey-expand-btn"
                  onClick={() =>
                    setExpanded(prev => ({ ...prev, [phase.courseId]: !isExpanded }))
                  }
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Collapse lessons' : 'Show lessons'}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={isExpanded ? 'rotated' : ''}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                  {isExpanded ? 'Hide lessons' : 'See all lessons'}
                </button>

                {isExpanded && (
                  <ul className="w-journey-lessons">
                    {phase.lessons.map((lesson, li) => {
                      const isLessonDone = cp?.completedParts.includes(lesson.id) ?? false;
                      return (
                        <li
                          key={lesson.id}
                          className={`w-journey-lesson${isLessonDone ? ' done' : ''}`}
                        >
                          <span className="w-journey-lesson-num">{li + 1}</span>
                          <span className="w-journey-lesson-title">{lesson.title}</span>
                          {isLessonDone && (
                            <svg
                              className="w-journey-lesson-check"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-label="Completed"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* CTA */}
                <Link
                  href={`/world/courses/${phase.courseId}`}
                  className={`w-btn w-btn-sm ${
                    isDone ? 'w-btn-ghost' : isStarted ? 'w-btn-primary' : 'w-btn-ghost'
                  } w-journey-cta`}
                >
                  {isDone ? 'Review course' : isStarted ? 'Continue' : 'Start phase'}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
