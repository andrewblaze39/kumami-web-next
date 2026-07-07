'use client';

/**
 * LearnerStats — "My Insights" section of the learner dashboard.
 *
 * Shows:
 *  - Lessons completed (total completedParts across all phases)
 *  - Courses completed (phases where completedParts === totalParts, i.e. 100%)
 *
 * Learning-time metric deliberately omitted (PM decision).
 */

import type { CourseProgress } from '@/lib/education/progress';

interface LearnerStatsProps {
  progress: CourseProgress[];
}

export default function LearnerStats({ progress }: LearnerStatsProps) {
  const lessonsCompleted = progress.reduce(
    (sum, cp) => sum + cp.completedParts.length,
    0,
  );

  const coursesCompleted = progress.filter(
    (cp) => cp.totalParts > 0 && cp.completedParts.length >= cp.totalParts,
  ).length;

  return (
    <div className="w-dash-insights">
      <div className="w-dash-stat">
        <span className="w-dash-stat-num">{lessonsCompleted}</span>
        <span className="w-dash-stat-label">Lessons completed</span>
      </div>
      <div className="w-dash-stat">
        <span className="w-dash-stat-num">{coursesCompleted}</span>
        <span className="w-dash-stat-label">Courses completed</span>
      </div>
    </div>
  );
}
