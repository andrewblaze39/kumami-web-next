/**
 * Tests for src/lib/education/placementQuiz.ts
 *
 * Covers:
 * - QUIZ_QUESTIONS: correct count and required fields
 * - scoreQuiz: all-no → 0, all-yes → 5, partial counts
 * - scoreToPhase: every boundary value
 * - getRecommendedPhase: end-to-end convenience wrapper
 */

import { describe, it, expect } from 'vitest';
import {
  QUIZ_QUESTIONS,
  scoreQuiz,
  scoreToPhase,
  getRecommendedPhase,
  type QuizAnswers,
} from '../placementQuiz';

// ---------- QUIZ_QUESTIONS ----------

describe('QUIZ_QUESTIONS', () => {
  it('has exactly 5 questions', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(5);
  });

  it('each question has a unique id, non-empty text, yesLabel, noLabel', () => {
    const ids = new Set<string>();
    for (const q of QUIZ_QUESTIONS) {
      expect(q.id).toBeTruthy();
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.yesLabel).toBeTruthy();
      expect(q.noLabel).toBeTruthy();
      ids.add(q.id);
    }
    expect(ids.size).toBe(5);
  });

  it('question ids are q1 through q5', () => {
    expect(QUIZ_QUESTIONS.map(q => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
  });
});

// ---------- scoreQuiz ----------

describe('scoreQuiz()', () => {
  it('returns 0 for all-no answers', () => {
    const answers: QuizAnswers = { q1: 'no', q2: 'no', q3: 'no', q4: 'no', q5: 'no' };
    expect(scoreQuiz(answers)).toBe(0);
  });

  it('returns 5 for all-yes answers', () => {
    const answers: QuizAnswers = { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes', q5: 'yes' };
    expect(scoreQuiz(answers)).toBe(5);
  });

  it('returns 1 for a single yes', () => {
    const answers: QuizAnswers = { q1: 'yes', q2: 'no', q3: 'no', q4: 'no', q5: 'no' };
    expect(scoreQuiz(answers)).toBe(1);
  });

  it('returns 2 for two yes answers', () => {
    const answers: QuizAnswers = { q1: 'yes', q2: 'yes', q3: 'no', q4: 'no', q5: 'no' };
    expect(scoreQuiz(answers)).toBe(2);
  });

  it('returns 3 for three yes answers', () => {
    const answers: QuizAnswers = { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'no', q5: 'no' };
    expect(scoreQuiz(answers)).toBe(3);
  });

  it('returns 4 for four yes answers', () => {
    const answers: QuizAnswers = { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes', q5: 'no' };
    expect(scoreQuiz(answers)).toBe(4);
  });

  it('treats missing answer keys as "no" (score 0)', () => {
    expect(scoreQuiz({})).toBe(0);
  });
});

// ---------- scoreToPhase ----------

describe('scoreToPhase()', () => {
  it('score 0 → phase 1', () => {
    expect(scoreToPhase(0)).toBe(1);
  });

  it('score 1 → phase 1', () => {
    expect(scoreToPhase(1)).toBe(1);
  });

  it('score 2 → phase 2', () => {
    expect(scoreToPhase(2)).toBe(2);
  });

  it('score 3 → phase 3', () => {
    expect(scoreToPhase(3)).toBe(3);
  });

  it('score 4 → phase 4', () => {
    expect(scoreToPhase(4)).toBe(4);
  });

  it('score 5 → phase 5', () => {
    expect(scoreToPhase(5)).toBe(5);
  });
});

// ---------- getRecommendedPhase ----------

describe('getRecommendedPhase()', () => {
  it('all-no answers → phase 1', () => {
    const answers: QuizAnswers = { q1: 'no', q2: 'no', q3: 'no', q4: 'no', q5: 'no' };
    expect(getRecommendedPhase(answers)).toBe(1);
  });

  it('all-yes answers → phase 5', () => {
    const answers: QuizAnswers = { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes', q5: 'yes' };
    expect(getRecommendedPhase(answers)).toBe(5);
  });

  it('2 yes answers → phase 2', () => {
    const answers: QuizAnswers = { q1: 'yes', q2: 'yes', q3: 'no', q4: 'no', q5: 'no' };
    expect(getRecommendedPhase(answers)).toBe(2);
  });

  it('3 yes answers → phase 3', () => {
    const answers: QuizAnswers = { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'no', q5: 'no' };
    expect(getRecommendedPhase(answers)).toBe(3);
  });

  it('4 yes answers → phase 4', () => {
    const answers: QuizAnswers = { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes', q5: 'no' };
    expect(getRecommendedPhase(answers)).toBe(4);
  });
});
