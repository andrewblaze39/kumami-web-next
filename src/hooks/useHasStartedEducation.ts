'use client'

import { useEducationProgress } from './useEducationProgress'

/**
 * Whether the user has made any progress in any of the 5 education levels.
 * Used to decide whether "My Journey" shows the level-picker intro (never
 * started) or the Dashboard experience (already underway) — the same signal
 * DashboardHome already derives per-level, aggregated across all 5 levels.
 */
export function useHasStartedEducation(): { hasStarted: boolean; loaded: boolean } {
  const l1 = useEducationProgress(1)
  const l2 = useEducationProgress(2)
  const l3 = useEducationProgress(3)
  const l4 = useEducationProgress(4)
  const l5 = useEducationProgress(5)

  const levels = [l1, l2, l3, l4, l5]
  const loaded = levels.every(l => l.loaded)
  const hasStarted = levels.some(
    l => l.progress.completedChapters.length > 0 || Object.keys(l.progress.sectionProgress).length > 0
  )

  return { hasStarted, loaded }
}
