/**
 * src/lib/education/placementQuiz.ts
 *
 * Static 5-question placement quiz.
 * Questions map to crypto experience signals; each "yes" answer scores 1 point.
 * Total score (0–5) maps to a recommended starting phase (1–5).
 *
 * This module is safe to import from both server and client components.
 * Quiz result is persisted to localStorage by the UI layer — no Firestore write needed.
 */

// ---------- Types ----------

export interface QuizQuestion {
  id: string;
  text: string;
  /** Label for the "yes" option */
  yesLabel?: string;
  /** Label for the "no" option */
  noLabel?: string;
}

export type QuizAnswer = 'yes' | 'no';

export interface QuizAnswers {
  [questionId: string]: QuizAnswer;
}

// ---------- Questions (5 static questions about crypto experience) ----------

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    text: 'Have you ever owned cryptocurrency (e.g. Bitcoin or Ethereum)?',
    yesLabel: 'Yes, I have',
    noLabel: 'Not yet',
  },
  {
    id: 'q2',
    text: 'Have you used a centralised exchange (CEX) like Coinbase, Binance, or Kraken?',
    yesLabel: 'Yes, I have',
    noLabel: 'No, I haven\'t',
  },
  {
    id: 'q3',
    text: 'Have you read a crypto project\'s whitepaper or researched tokenomics before buying?',
    yesLabel: 'Yes, I research first',
    noLabel: 'No, I haven\'t',
  },
  {
    id: 'q4',
    text: 'Have you ever placed a leveraged trade or used a DeFi protocol (e.g. Uniswap, Aave)?',
    yesLabel: 'Yes, I have',
    noLabel: 'No, I haven\'t',
  },
  {
    id: 'q5',
    text: 'Do you actively manage a crypto portfolio — tracking allocation, market cycles, or on-chain data?',
    yesLabel: 'Yes, actively',
    noLabel: 'No, not yet',
  },
];

// ---------- Scoring ----------

/**
 * Score a set of answers.
 * Each "yes" response contributes 1 point. Returns total score (0–5).
 */
export function scoreQuiz(answers: QuizAnswers): number {
  return QUIZ_QUESTIONS.reduce((sum, q) => {
    return sum + (answers[q.id] === 'yes' ? 1 : 0);
  }, 0);
}

/**
 * Map a score (0–5) to the recommended starting phase (1–5).
 *
 * Boundary logic:
 *   0   → Phase 1 (START HERE — complete beginner)
 *   1   → Phase 1 (owns crypto but hasn't used exchange yet or vice versa)
 *   2   → Phase 2 (exchanged crypto but hasn't gone deeper yet)
 *   3   → Phase 3 (basic experience, ready to learn to trade)
 *   4   → Phase 4 (actively trading, ready to think like an investor)
 *   5   → Phase 5 (experienced, go deeper into advanced/expert territory)
 */
export function scoreToPhase(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score <= 1) return 1;
  if (score === 2) return 2;
  if (score === 3) return 3;
  if (score === 4) return 4;
  return 5;
}

/** Convenience: score answers and derive phase in one call. */
export function getRecommendedPhase(answers: QuizAnswers): 1 | 2 | 3 | 4 | 5 {
  return scoreToPhase(scoreQuiz(answers));
}

// ---------- localStorage persistence ----------

const LS_KEY = 'kumami_placement_quiz_result';

export interface QuizResult {
  answers: QuizAnswers;
  score: number;
  phase: 1 | 2 | 3 | 4 | 5;
  completedAt: string; // ISO date
}

export function saveQuizResult(result: QuizResult): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(result));
  } catch {
    // Silently ignore — SSR or private browsing
  }
}

export function loadQuizResult(): QuizResult | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuizResult;
  } catch {
    return null;
  }
}

export function clearQuizResult(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}
