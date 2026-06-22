import { PHASES } from '@/data/educationPhases'
import type { Phase } from '@/data/educationPhases'

/**
 * Resolve any level representation to a number 1-5, or null.
 * Handles: number 1, string "Level 1", string "Level 01", string "level 1"
 */
export function resolveLevelNumber(level: unknown): number | null {
  if (typeof level === 'number') return level
  if (typeof level === 'string') {
    const m = level.match(/\bLevel\s*0?(\d+)\b/i)
    return m ? Number(m[1]) : null
  }
  return null
}

/**
 * Format a level number for display: "Level 1", "Level 2", etc.
 */
export function formatLevelLabel(levelNum: number): string {
  return `Level ${levelNum}`
}

/**
 * Get the Phase data from educationPhases.ts for a given level number.
 */
export function getLevelData(levelNum: number): Phase | undefined {
  return PHASES.find(p => p.n === levelNum)
}

/**
 * Get the chapter name for a given level + chapterIndex from PHASES.
 */
export function getChapterName(levelNum: number, chapterIndex: number): string | undefined {
  const phase = getLevelData(levelNum)
  return phase?.chapters[chapterIndex]
}

/**
 * Get all chapter names for a level.
 */
export function getChaptersForLevel(levelNum: number): string[] {
  const phase = getLevelData(levelNum)
  return phase?.chapters ?? []
}

/**
 * Get the level color hex from PHASES.
 */
export function getLevelColor(levelNum: number): string {
  const phase = getLevelData(levelNum)
  return phase?.hex ?? '#5ee9a8'
}
