'use client';

/**
 * /world/dashboard — Learner Dashboard
 *
 * Sections:
 *  1. Start-here placement quiz (5 questions, localStorage-persisted result)
 *  2. Continue learning (in-progress courses)
 *  3. Learning history (per-phase % breakdown)
 *  4. My insights (lessons + courses completed)
 *  5. My achievements (5 phase badges)
 *  6. New & updated courses (static row of the 5 journey courses)
 *     NOTE: "recently updated" is mock until an editorial pipeline exists.
 *
 * Progress is fetched client-side via useEducationProgress().
 * Quiz result is persisted to localStorage — no Firestore write needed.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEducationProgress } from '@/components/world/education/useEducationProgress';
import LearnerStats from '@/components/world/education/LearnerStats';
import AchievementBadges from '@/components/world/education/AchievementBadges';
import { JOURNEY_PHASES } from '@/lib/education/journeyData';
import {
  QUIZ_QUESTIONS,
  scoreQuiz,
  scoreToPhase,
  saveQuizResult,
  loadQuizResult,
  clearQuizResult,
  type QuizAnswers,
  type QuizResult,
} from '@/lib/education/placementQuiz';
import type { CourseProgress } from '@/lib/education/progress';
import type { CourseDoc } from '@/lib/education/courses';

// ---------- Helpers ----------

/**
 * Build a resume deep-link for a course.
 * Replicates the buildResumeHref logic from CoursePage.tsx:
 * find the chapter containing lastPartId, fall back to first chapter.
 *
 * Since we only have journeyData here (not the seeded CourseDoc), we
 * derive the chapter id from the lesson index: each lesson → ch-{i+1}.
 */
function buildResumeHref(
  courseId: string,
  lastPartId: string | null,
): string {
  const phase = JOURNEY_PHASES.find((p) => p.courseId === courseId);
  if (!phase) return `/world/courses/${courseId}`;

  if (!lastPartId) return `/world/courses/${courseId}`;

  const lessonIndex = phase.lessons.findIndex((l) => l.id === lastPartId);
  if (lessonIndex === -1) return `/world/courses/${courseId}`;

  const chapterId = `ch-${lessonIndex + 1}`;
  return `/world/courses/${courseId}/${chapterId}?part=${lastPartId}`;
}

// ---------- Placement Quiz ----------

type QuizStep = 'idle' | 'active' | 'done';

function PlacementQuiz() {
  const [step, setStep] = useState<QuizStep>('idle');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  // Load persisted result on mount
  useEffect(() => {
    const saved = loadQuizResult();
    if (saved) {
      setResult(saved);
      setStep('done');
    }
  }, []);

  const handleAnswer = (answer: 'yes' | 'no') => {
    const q = QUIZ_QUESTIONS[currentQ];
    const newAnswers = { ...answers, [q.id]: answer };
    setAnswers(newAnswers);

    if (currentQ < QUIZ_QUESTIONS.length - 1) {
      setCurrentQ((i) => i + 1);
    } else {
      // Quiz complete
      const score = scoreQuiz(newAnswers);
      const phase = scoreToPhase(score);
      const r: QuizResult = {
        answers: newAnswers,
        score,
        phase,
        completedAt: new Date().toISOString(),
      };
      saveQuizResult(r);
      setResult(r);
      setStep('done');
    }
  };

  const handleRetake = () => {
    clearQuizResult();
    setResult(null);
    setAnswers({});
    setCurrentQ(0);
    setStep('active');
  };

  const phaseData = result
    ? JOURNEY_PHASES.find((p) => p.phase === result.phase)
    : null;

  if (step === 'idle') {
    return (
      <div className="w-dash-quiz-card">
        <div className="w-dash-quiz-icon" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <circle cx="20" cy="20" r="19" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x="20" y="27" textAnchor="middle" fontSize="20" fill="var(--accent)">?</text>
          </svg>
        </div>
        <div className="w-dash-quiz-body">
          <h3 className="w-dash-card-title">Find your starting point</h3>
          <p className="w-dash-card-desc">
            5 quick questions — we&apos;ll recommend the right phase for you.
          </p>
        </div>
        <button
          className="w-btn w-btn-primary w-btn-sm"
          onClick={() => setStep('active')}
        >
          Start quiz
        </button>
      </div>
    );
  }

  if (step === 'done' && result && phaseData) {
    return (
      <div className="w-dash-quiz-card w-dash-quiz-result">
        <div className="w-dash-quiz-result-phase">
          <span className="w-dash-quiz-phase-num">{result.phase}</span>
        </div>
        <div className="w-dash-quiz-body">
          <h3 className="w-dash-card-title">
            Start at Phase {result.phase}: {phaseData.title}
          </h3>
          <p className="w-dash-card-desc">{phaseData.tagline}</p>
        </div>
        <div className="w-dash-quiz-actions">
          <Link
            href={`/world/courses/phase-${result.phase}`}
            className="w-btn w-btn-primary w-btn-sm"
          >
            Go to course
          </Link>
          <button
            className="w-btn w-btn-ghost w-btn-sm"
            onClick={handleRetake}
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  // Active quiz
  const q = QUIZ_QUESTIONS[currentQ];
  const progress = ((currentQ) / QUIZ_QUESTIONS.length) * 100;

  return (
    <div className="w-dash-quiz-card w-dash-quiz-active">
      <div className="w-dash-quiz-progress-row">
        <span className="w-dash-quiz-qnum">
          {currentQ + 1} / {QUIZ_QUESTIONS.length}
        </span>
        <div className="w-dash-quiz-bar-track">
          <div
            className="w-dash-quiz-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <p className="w-dash-quiz-question">{q.text}</p>
      <div className="w-dash-quiz-btns">
        <button
          className="w-btn w-btn-primary"
          onClick={() => handleAnswer('yes')}
        >
          {q.yesLabel ?? 'Yes'}
        </button>
        <button
          className="w-btn w-btn-ghost"
          onClick={() => handleAnswer('no')}
        >
          {q.noLabel ?? 'No'}
        </button>
      </div>
    </div>
  );
}

// ---------- Continue Learning ----------

function ContinueLearning({ progress }: { progress: CourseProgress[] }) {
  const inProgress = progress.filter(
    (cp) =>
      cp.completedParts.length > 0 &&
      cp.completedParts.length < cp.totalParts,
  );

  if (inProgress.length === 0) {
    return (
      <div className="w-dash-empty">
        <p>No courses in progress yet. Start a course to see it here.</p>
        <Link href="/world/courses" className="w-btn w-btn-ghost w-btn-sm">
          Browse courses
        </Link>
      </div>
    );
  }

  return (
    <div className="w-dash-continue-list">
      {inProgress.map((cp) => {
        const phase = JOURNEY_PHASES.find((p) => p.courseId === cp.courseId);
        if (!phase) return null;
        const pct = Math.round((cp.completedParts.length / cp.totalParts) * 100);
        const resumeHref = buildResumeHref(cp.courseId, cp.lastPartId);

        return (
          <div key={cp.courseId} className="w-dash-continue-item">
            <div className="w-dash-continue-meta">
              <span className="w-dash-phase-badge">Phase {phase.phase}</span>
              <span className="w-dash-continue-level">{phase.level}</span>
            </div>
            <div className="w-dash-continue-title">{phase.title}</div>
            <div className="w-dash-continue-bar-wrap">
              <div className="w-progress-bar-track">
                <div
                  className="w-progress-bar-fill"
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${pct}% complete`}
                />
              </div>
              <span className="w-dash-continue-pct">{pct}%</span>
            </div>
            <Link href={resumeHref} className="w-btn w-btn-primary w-btn-sm">
              Resume
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Learning History ----------

function LearningHistory({ progress }: { progress: CourseProgress[] }) {
  const progressMap: Record<string, CourseProgress> = {};
  for (const cp of progress) {
    progressMap[cp.courseId] = cp;
  }

  return (
    <div className="w-dash-history-list">
      {JOURNEY_PHASES.map((phase) => {
        const cp = progressMap[phase.courseId];
        const completed = cp?.completedParts.length ?? 0;
        const total = cp?.totalParts ?? phase.lessons.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div key={phase.courseId} className="w-dash-history-row">
            <div className="w-dash-history-meta">
              <span className="w-dash-phase-badge">Ph {phase.phase}</span>
              <span className="w-dash-history-title">{phase.title}</span>
              <span className="w-dash-history-level">{phase.level}</span>
            </div>
            <div className="w-dash-history-bar-wrap">
              <div className="w-progress-bar-track">
                <div
                  className="w-progress-bar-fill"
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Phase ${phase.phase} ${pct}% complete`}
                />
              </div>
            </div>
            <span className="w-dash-history-pct">{pct}%</span>
            <span className="w-dash-history-count">
              {completed}/{total}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- New & Updated Courses (static) ----------

function NewCoursesRow() {
  // Static row of the 5 journey courses.
  // NOTE: "recently updated" labels are mock until an editorial pipeline tracks
  // course update timestamps. Replace with real data when available.
  const MOCK_UPDATED: Record<string, string> = {
    'phase-1': 'Updated Jul 2026',
    'phase-2': 'Updated Jul 2026',
    'phase-3': 'New Jul 2026',
    'phase-4': 'New Jul 2026',
    'phase-5': 'New Jul 2026',
  };

  return (
    <div className="w-dash-courses-row">
      {JOURNEY_PHASES.map((phase) => (
        <Link
          key={phase.courseId}
          href={`/world/courses/${phase.courseId}`}
          className="w-dash-course-card"
        >
          <div className="w-dash-course-header">
            <span className="w-dash-phase-badge">Phase {phase.phase}</span>
            <span className="w-dash-course-updated">{MOCK_UPDATED[phase.courseId]}</span>
          </div>
          <div className="w-dash-course-title">{phase.title}</div>
          <div className="w-dash-course-meta">
            {phase.lessons.length} lessons · ~{phase.approxHours}h
          </div>
          <div className="w-dash-course-level">{phase.level}</div>
        </Link>
      ))}
    </div>
  );
}

// ---------- Section wrapper ----------

function DashSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-dash-section">
      <h2 className="w-dash-section-title">{title}</h2>
      {children}
    </section>
  );
}

// ---------- Page ----------

export default function DashboardPage() {
  const progress = useEducationProgress();

  return (
    <div className="w-content-inner w-dash-root">
      <header className="w-dash-header">
        <h1 className="w-page-title">Dashboard</h1>
        <p className="w-page-sub">Your personal learning overview.</p>
      </header>

      {/* 1. Placement quiz */}
      <DashSection title="Start Here">
        <PlacementQuiz />
      </DashSection>

      {/* 2. Continue learning */}
      <DashSection title="Continue Learning">
        <ContinueLearning progress={progress} />
      </DashSection>

      {/* 3. Learning history */}
      <DashSection title="Learning History">
        <LearningHistory progress={progress} />
      </DashSection>

      {/* 4. My insights */}
      <DashSection title="My Insights">
        <LearnerStats progress={progress} />
      </DashSection>

      {/* 5. Achievements */}
      <DashSection title="My Achievements">
        <AchievementBadges progress={progress} />
      </DashSection>

      {/* 6. New & updated courses */}
      <DashSection title="New & Updated Courses">
        <NewCoursesRow />
      </DashSection>
    </div>
  );
}
