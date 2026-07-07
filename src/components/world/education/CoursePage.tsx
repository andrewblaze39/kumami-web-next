'use client';

/**
 * CoursePage — CFI-style course detail page (client component).
 *
 * Receives the full course doc (or the derived fallback) and progress
 * as props from the server component parent.
 *
 * Tabs: Overview | Details | Instructor | Reviews | FAQ
 *
 * - Overview: chapters with expand-arrow revealing parts list.
 * - Details: what you'll learn (derived from lessons/tagline).
 * - Instructor: hidden if the `instructor` field is empty/absent.
 * - Reviews: subcollection list; empty state "No reviews yet". No write UI.
 * - FAQ: from `faq` field; hidden if empty.
 */

import { useState } from 'react';
import Link from 'next/link';
import ProgressBar from './ProgressBar';
import { useEducationProgress } from './useEducationProgress';
import type { CourseDoc } from '@/lib/education/courses';
import type { CourseProgress } from '@/lib/education/progress';

// ---------- Types ----------

interface CoursePageProps {
  course: CourseDoc;
  progress: CourseProgress;
  reviews: ReviewItem[];
}

interface ReviewItem {
  id: string;
  author?: string;
  rating?: number;
  text?: string;
  createdAt?: string;
}

type TabKey = 'overview' | 'details' | 'instructor' | 'reviews' | 'faq';

// ---------- Helpers ----------

function buildResumeHref(
  courseId: string,
  lastPartId: string | null,
  chapters: CourseDoc['chapters'],
): string | null {
  if (!lastPartId) return null;
  const ch =
    chapters.find(c => c.parts.some(p => p.id === lastPartId)) ?? chapters[0];
  if (!ch) return null;
  return `/world/courses/${courseId}/${ch.id}?part=${lastPartId}`;
}

// ---------- Tab: Overview ----------

function OverviewTab({ course, progress }: { course: CourseDoc; progress: CourseProgress }) {
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const toggle = (chId: string) =>
    setExpandedChapters(prev => ({ ...prev, [chId]: !prev[chId] }));

  return (
    <div className="w-course-overview">
      <p className="w-course-overview-intro">
        {course.tagline}
      </p>
      <div className="w-chapters-list">
        {course.chapters.map((chapter, ci) => {
          const isOpen = !!expandedChapters[chapter.id];
          const completedInChapter = chapter.parts.filter(p =>
            progress.completedParts.includes(p.id),
          ).length;
          return (
            <div key={chapter.id} className={`w-chapter-item${isOpen ? ' open' : ''}`}>
              <button
                className="w-chapter-header"
                onClick={() => toggle(chapter.id)}
                aria-expanded={isOpen}
              >
                <span className="w-chapter-num">{ci + 1}</span>
                <span className="w-chapter-title">{chapter.title}</span>
                <span className="w-chapter-meta">
                  {chapter.parts.length} part{chapter.parts.length !== 1 ? 's' : ''}
                  {completedInChapter > 0 && (
                    <span className="w-chapter-done">
                      {completedInChapter}/{chapter.parts.length} done
                    </span>
                  )}
                </span>
                <svg
                  className="w-chapter-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isOpen && (
                <ul className="w-parts-list">
                  {chapter.parts.map((part, pi) => {
                    const done = progress.completedParts.includes(part.id);
                    return (
                      <li key={part.id} className={`w-part-item${done ? ' done' : ''}`}>
                        <span className="w-part-type-icon" aria-hidden="true">
                          {part.type === 'video' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15.5 8.5 20 12l-4.5 3.5V8.5Z" /><rect x="2" y="6" width="14" height="12" rx="2" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" />
                            </svg>
                          )}
                        </span>
                        <span className="w-part-num">{pi + 1}.</span>
                        <span className="w-part-title">{part.title}</span>
                        {done && (
                          <svg
                            className="w-part-check"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Tab: Details ----------

function DetailsTab({ course }: { course: CourseDoc }) {
  const lessons = course.chapters.flatMap(ch => ch.parts.map(p => p.title));
  return (
    <div className="w-course-details">
      <h3 className="w-details-heading">What you&apos;ll learn</h3>
      <p className="w-details-intro">{course.tagline}</p>
      <ul className="w-details-list">
        {lessons.map((title, i) => (
          <li key={i} className="w-details-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {title}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Tab: Instructor ----------

function InstructorTab({ course }: { course: CourseDoc }) {
  const instr = course.instructor;
  if (!instr) return null;
  return (
    <div className="w-course-instructor">
      {instr.avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={instr.avatarUrl} alt={instr.name ?? 'Instructor'} className="w-instr-avatar" />
      )}
      <div className="w-instr-body">
        <h3 className="w-instr-name">{instr.name}</h3>
        {instr.title && <p className="w-instr-title">{instr.title}</p>}
        {instr.bio && <p className="w-instr-bio">{instr.bio}</p>}
      </div>
    </div>
  );
}

// ---------- Tab: Reviews ----------

function ReviewsTab({ reviews }: { reviews: ReviewItem[] }) {
  if (reviews.length === 0) {
    return (
      <div className="w-reviews-empty">
        <p>No reviews yet.</p>
        <span className="w-reviews-sub">Be the first to complete this course and leave a review.</span>
      </div>
    );
  }
  return (
    <ul className="w-reviews-list">
      {reviews.map(r => (
        <li key={r.id} className="w-review-item">
          <div className="w-review-meta">
            <span className="w-review-author">{r.author ?? 'Anonymous'}</span>
            {r.rating != null && (
              <span className="w-review-rating">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            )}
          </div>
          {r.text && <p className="w-review-text">{r.text}</p>}
        </li>
      ))}
    </ul>
  );
}

// ---------- Tab: FAQ ----------

function FaqTab({ faq }: { faq: CourseDoc['faq'] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!faq || faq.length === 0) return null;
  return (
    <div className="w-course-faq">
      {faq.map((item, i) => (
        <div key={i} className={`w-faq-item${openIdx === i ? ' open' : ''}`}>
          <button
            className="w-faq-q"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            aria-expanded={openIdx === i}
          >
            {item.q}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {openIdx === i && <p className="w-faq-a">{item.a}</p>}
        </div>
      ))}
    </div>
  );
}

// ---------- Main component ----------

export default function CoursePage({ course, progress: initialProgress, reviews }: CoursePageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Hydrate progress client-side; fall back to SSR-provided initial (empty) progress
  // until auth and the API response are ready.
  const allProgress = useEducationProgress();
  const liveEntry = allProgress.find(p => p.courseId === course.courseId);
  const progress: CourseProgress = liveEntry ?? initialProgress;

  const pct =
    progress.totalParts > 0
      ? Math.round((progress.completedParts.length / progress.totalParts) * 100)
      : 0;

  const resumeHref = buildResumeHref(course.courseId, progress.lastPartId, course.chapters);

  const hasInstructor = !!course.instructor;
  const hasFaq = (course.faq?.length ?? 0) > 0;

  const tabs: { key: TabKey; label: string; hidden?: boolean }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'details', label: 'Details' },
    { key: 'instructor', label: 'Instructor', hidden: !hasInstructor },
    { key: 'reviews', label: 'Reviews' },
    { key: 'faq', label: 'FAQ', hidden: !hasFaq },
  ];

  return (
    <div className="w-course-page">
      {/* ---- Header ---- */}
      <header className="w-course-header">
        <div className="w-course-header-top">
          <Link href="/world/courses" className="w-course-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            All courses
          </Link>
          <span className="w-course-level-pill">{course.level}</span>
        </div>

        <h1 className="w-course-title">
          <span className="w-course-phase-num">Phase {course.phase}.</span>{' '}
          {course.title}
        </h1>
        <p className="w-course-tagline">{course.tagline}</p>

        {/* Progress bar */}
        {progress.totalParts > 0 && (
          <div className="w-course-progress-wrap">
            <ProgressBar
              pct={pct}
              completed={progress.completedParts.length}
              total={progress.totalParts}
            />
          </div>
        )}

        {/* Resume button */}
        <div className="w-course-header-actions">
          {resumeHref && progress.completedParts.length > 0 ? (
            <Link href={resumeHref} className="w-btn w-btn-primary">
              Resume course
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3Z" />
              </svg>
            </Link>
          ) : (
            <Link href={`/world/courses/${course.courseId}/${course.chapters[0]?.id ?? ''}`} className="w-btn w-btn-primary">
              Start course
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3Z" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      {/* ---- Tabs ---- */}
      <nav className="w-course-tabs" aria-label="Course sections">
        {tabs.filter(t => !t.hidden).map(t => (
          <button
            key={t.key}
            className={`w-course-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            aria-selected={activeTab === t.key}
            role="tab"
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ---- Tab content ---- */}
      <div className="w-course-tab-content">
        {activeTab === 'overview' && (
          <OverviewTab course={course} progress={progress} />
        )}
        {activeTab === 'details' && (
          <DetailsTab course={course} />
        )}
        {activeTab === 'instructor' && hasInstructor && (
          <InstructorTab course={course} />
        )}
        {activeTab === 'reviews' && (
          <ReviewsTab reviews={reviews} />
        )}
        {activeTab === 'faq' && hasFaq && (
          <FaqTab faq={course.faq} />
        )}
      </div>
    </div>
  );
}
