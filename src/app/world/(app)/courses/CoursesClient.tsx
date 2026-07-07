'use client';

/**
 * CoursesClient — client wrapper for the Courses page.
 *
 * Responsibilities:
 * 1. Fetches progress from /api/education/progress using the Firebase ID token.
 * 2. Provides the floating search FAB that expands to an input filtering lessons/phases.
 * 3. Renders JourneyPath with progress data.
 * 4. Renders warm-up section below the journey.
 */

import { useState, useEffect, useRef } from 'react';
import JourneyPath from '@/components/world/education/JourneyPath';
import { JOURNEY_PHASES } from '@/lib/education/journeyData';
import { useEducationProgress } from '@/components/world/education/useEducationProgress';
import Link from 'next/link';

// ---------- Search filter ----------

interface SearchMatch {
  phaseIdx: number;
  lessonIdx: number;
  lessonTitle: string;
  phaseTitle: string;
  courseId: string;
}

function searchMatches(query: string): SearchMatch[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchMatch[] = [];
  for (let pi = 0; pi < JOURNEY_PHASES.length; pi++) {
    const phase = JOURNEY_PHASES[pi];
    for (let li = 0; li < phase.lessons.length; li++) {
      const lesson = phase.lessons[li];
      if (
        lesson.title.toLowerCase().includes(q) ||
        phase.title.toLowerCase().includes(q) ||
        phase.tagline.toLowerCase().includes(q)
      ) {
        results.push({
          phaseIdx: pi,
          lessonIdx: li,
          lessonTitle: lesson.title,
          phaseTitle: phase.title,
          courseId: phase.courseId,
        });
      }
    }
  }
  return results;
}

// ---------- Component ----------

export default function CoursesClient() {
  const progress = useEducationProgress();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const matches = searchMatches(searchQuery);

  return (
    <div className="w-courses-body">
      {/* ---- Floating search FAB ---- */}
      <div className={`w-search-fab-wrap${searchOpen ? ' open' : ''}`}>
        {searchOpen ? (
          <div className="w-search-expand">
            <svg
              className="w-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search lessons or phases…"
              className="w-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search lessons and phases"
            />
            <button
              className="w-search-close"
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              aria-label="Close search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            className="w-search-fab"
            onClick={() => setSearchOpen(true)}
            aria-label="Search lessons"
            title="Search lessons"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        )}
      </div>

      {/* ---- Search results overlay ---- */}
      {searchOpen && searchQuery.trim() && (
        <div className="w-search-results">
          {matches.length === 0 ? (
            <p className="w-search-empty">No lessons match &ldquo;{searchQuery}&rdquo;</p>
          ) : (
            <ul className="w-search-result-list">
              {matches.map(m => (
                <li key={`${m.courseId}-${m.lessonIdx}`}>
                  <Link
                    href={`/world/courses/${m.courseId}`}
                    className="w-search-result-item"
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  >
                    <span className="w-search-result-phase">
                      Phase {m.phaseIdx + 1} · {m.phaseTitle}
                    </span>
                    <span className="w-search-result-lesson">{m.lessonTitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---- Journey path (primary content) ---- */}
      <JourneyPath progress={progress} />

      {/* ---- Warm-up section (below journey per PM doc) ---- */}
      <section className="w-warmup-section">
        <h2 className="w-section-title">Warm Up</h2>
        <p className="w-section-sub">
          Not sure where to start? Take a quick quiz to find out which phase suits you best.
        </p>
        <Link href="/world/courses/phase-1" className="w-btn w-btn-ghost w-btn-sm">
          Start from the beginning
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
