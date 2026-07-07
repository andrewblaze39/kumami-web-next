/**
 * Tests for src/lib/education/journeyData.ts
 *
 * Verifies:
 * - Exactly 5 phases
 * - Lesson counts per phase: 8 / 13 / 18 / 13 / 13
 * - Presence of the HANDS-ON: Buy your first Bitcoin lesson (verbatim)
 * - Phase courseIds match expected slugs
 * - Level labels are correct
 */

import { describe, it, expect } from 'vitest';
import {
  JOURNEY_PHASES,
  TOTAL_LESSONS,
  getPhaseById,
} from '../journeyData';

describe('JOURNEY_PHASES', () => {
  it('has exactly 5 phases', () => {
    expect(JOURNEY_PHASES).toHaveLength(5);
  });

  it('phase lesson counts are 8 / 13 / 18 / 13 / 13', () => {
    const counts = JOURNEY_PHASES.map(p => p.lessons.length);
    expect(counts).toEqual([8, 13, 18, 13, 13]);
  });

  it('TOTAL_LESSONS equals 65', () => {
    expect(TOTAL_LESSONS).toBe(65);
  });

  it('contains the HANDS-ON: Buy your first Bitcoin lesson verbatim in phase 1', () => {
    const phase1 = JOURNEY_PHASES[0];
    const lesson = phase1.lessons.find(l => l.title === 'HANDS-ON: Buy your first Bitcoin');
    expect(lesson).toBeDefined();
  });

  it('each phase has the correct courseId slug', () => {
    const ids = JOURNEY_PHASES.map(p => p.courseId);
    expect(ids).toEqual(['phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5']);
  });

  it('phase numbers are 1 through 5', () => {
    const nums = JOURNEY_PHASES.map(p => p.phase);
    expect(nums).toEqual([1, 2, 3, 4, 5]);
  });

  it('level labels are Beginner / Elementary / Intermediate / Advanced / Expert', () => {
    const levels = JOURNEY_PHASES.map(p => p.level);
    expect(levels).toEqual([
      'Beginner',
      'Elementary',
      'Intermediate',
      'Advanced',
      'Expert',
    ]);
  });

  it('phase 3 (LEARN TO TRADE) has 18 lessons', () => {
    const p3 = JOURNEY_PHASES[2];
    expect(p3.lessons).toHaveLength(18);
  });

  it('HANDS-ON lesson is the last lesson in each phase', () => {
    for (const phase of JOURNEY_PHASES) {
      const last = phase.lessons[phase.lessons.length - 1];
      expect(last.title).toMatch(/^HANDS-ON:/);
    }
  });
});

describe('getPhaseById()', () => {
  it('returns the correct phase for a valid id', () => {
    const p = getPhaseById('phase-3');
    expect(p).toBeDefined();
    expect(p?.phase).toBe(3);
    expect(p?.title).toBe('LEARN TO TRADE');
  });

  it('returns undefined for an unknown id', () => {
    expect(getPhaseById('phase-99')).toBeUndefined();
  });
});
