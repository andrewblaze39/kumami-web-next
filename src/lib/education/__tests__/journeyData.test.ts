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

describe('first and last lesson titles per phase (verbatim from PM doc)', () => {
  it('phase 1 first lesson', () => {
    expect(JOURNEY_PHASES[0].lessons[0].title).toBe(
      'How most beginners actually get into crypto',
    );
  });

  it('phase 1 last lesson', () => {
    const p1 = JOURNEY_PHASES[0];
    expect(p1.lessons[p1.lessons.length - 1].title).toBe('HANDS-ON: Buy your first Bitcoin');
  });

  it('phase 2 first lesson', () => {
    expect(JOURNEY_PHASES[1].lessons[0].title).toBe('What is blockchain');
  });

  it('phase 2 last lesson', () => {
    const p2 = JOURNEY_PHASES[1];
    expect(p2.lessons[p2.lessons.length - 1].title).toBe(
      'HANDS-ON: Move your Bitcoin to your own wallet',
    );
  });

  it('phase 3 first lesson', () => {
    expect(JOURNEY_PHASES[2].lessons[0].title).toBe('What are altcoins');
  });

  it('phase 3 last lesson', () => {
    const p3 = JOURNEY_PHASES[2];
    expect(p3.lessons[p3.lessons.length - 1].title).toBe(
      'HANDS-ON: Research and buy your first altcoin',
    );
  });

  it('phase 4 first lesson', () => {
    expect(JOURNEY_PHASES[3].lessons[0].title).toBe('How crypto market cycles work');
  });

  it('phase 4 last lesson', () => {
    const p4 = JOURNEY_PHASES[3];
    expect(p4.lessons[p4.lessons.length - 1].title).toBe(
      'HANDS-ON: Build your first investment thesis',
    );
  });

  it('phase 5 first lesson', () => {
    expect(JOURNEY_PHASES[4].lessons[0].title).toBe('How smart contracts work');
  });

  it('phase 5 last lesson', () => {
    const p5 = JOURNEY_PHASES[4];
    expect(p5.lessons[p5.lessons.length - 1].title).toBe('HANDS-ON: Ship something in Web3');
  });
});
