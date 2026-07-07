'use client';

/**
 * ChapterReader — Investopedia-style chapter reader.
 *
 * Receives pre-fetched course/chapter data as props (from a server component parent).
 * Handles:
 *   - Per-part rendering: text (placeholder body) + video (PiP-enabled)
 *   - Per-part completion checkboxes + progress writes via POST /api/education/progress
 *   - Per-part notes textarea (debounced save on change, final save on blur)
 *   - ?part= query param scroll-to on load
 *   - Prev/next chapter navigation + Continue/Next-chapter button
 *   - Breadcrumb back to course page
 *   - Skeleton loading state while auth resolves
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import PiPVideo from './PiPVideo';
import type { CourseDoc, CourseChapter, CoursePart } from '@/lib/education/courses';

// ---------- Types ----------

interface ChapterReaderProps {
  course: CourseDoc;
  chapter: CourseChapter;
  chapterIndex: number;        // 0-based index in course.chapters
  /** partId from ?part= query param — may be empty string */
  initialPartId: string;
}

// ---------- Hook: progress state + writes ----------

function useChapterProgress(
  courseId: string,
  chapterId: string,
  parts: CoursePart[],
  initialPartId: string,
) {
  const { currentUser, loading } = useAuth();
  const [completedParts, setCompletedParts] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [progressLoading, setProgressLoading] = useState(true);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load progress from API on mount
  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      setProgressLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const token = await currentUser!.getIdToken();
        const res = await fetch('/api/education/progress', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const entry = (data.progress ?? []).find(
          (p: { courseId: string }) => p.courseId === courseId,
        );
        if (entry?.completedParts) {
          setCompletedParts(new Set(entry.completedParts));
        }
      } catch {
        // Silently ignore — progress is advisory
      } finally {
        if (!cancelled) setProgressLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [currentUser, loading, courseId]);

  const writeProgress = useCallback(
    async (partId: string, done: boolean, note?: string) => {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const body: Record<string, unknown> = { courseId, partId, done };
        if (note !== undefined) body.note = note;
        await fetch('/api/education/progress', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      } catch {
        // Fire-and-forget — UI already optimistically updated
      }
    },
    [currentUser, courseId],
  );

  const togglePart = useCallback(
    (partId: string) => {
      setCompletedParts(prev => {
        const next = new Set(prev);
        const done = !next.has(partId);
        if (done) next.add(partId);
        else next.delete(partId);
        writeProgress(partId, done, notes[partId]);
        return next;
      });
    },
    [writeProgress, notes],
  );

  const updateNote = useCallback(
    (partId: string, value: string) => {
      setNotes(prev => ({ ...prev, [partId]: value }));
      // Debounced save (1.2 s)
      clearTimeout(debounceTimers.current[partId]);
      debounceTimers.current[partId] = setTimeout(() => {
        writeProgress(partId, completedParts.has(partId), value);
      }, 1200);
    },
    [writeProgress, completedParts],
  );

  const saveNoteNow = useCallback(
    (partId: string) => {
      clearTimeout(debounceTimers.current[partId]);
      writeProgress(partId, completedParts.has(partId), notes[partId] ?? '');
    },
    [writeProgress, completedParts, notes],
  );

  // Ignore chapterId and parts in dep array — they're stable per page render
  void chapterId;
  void parts;

  return {
    completedParts,
    notes,
    progressLoading,
    togglePart,
    updateNote,
    saveNoteNow,
  };
}

// ---------- Part renderer ----------

function PartBlock({
  part,
  partIndex,
  totalParts,
  done,
  note,
  onToggle,
  onNoteChange,
  onNoteBlur,
  isActive,
  partRef,
}: {
  part: CoursePart;
  partIndex: number;
  totalParts: number;
  done: boolean;
  note: string;
  onToggle: () => void;
  onNoteChange: (v: string) => void;
  onNoteBlur: () => void;
  isActive: boolean;
  partRef: React.RefCallback<HTMLElement>;
}) {
  return (
    <section
      id={`part-${part.id}`}
      ref={partRef}
      className={`w-chapter-part${done ? ' done' : ''}${isActive ? ' w-chapter-part-active' : ''}`}
      aria-label={`Part ${partIndex + 1} of ${totalParts}: ${part.title}`}
    >
      {/* Part header */}
      <div className="w-part-header">
        <span className="w-part-index-label">
          {part.type === 'video' ? (
            <svg className="w-part-type-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15.5 8.5 20 12l-4.5 3.5V8.5Z" /><rect x="2" y="6" width="14" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-part-type-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" />
            </svg>
          )}
          Part {partIndex + 1}
        </span>
        <h2 className="w-part-title">{part.title}</h2>
      </div>

      {/* Content */}
      {part.type === 'video' && part.videoUrl ? (
        <div className="w-part-video-wrap">
          <PiPVideo src={part.videoUrl} title={part.title} />
        </div>
      ) : part.type === 'video' ? (
        <div className="w-part-placeholder w-part-placeholder-video">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15.5 8.5 20 12l-4.5 3.5V8.5Z" /><rect x="2" y="6" width="14" height="12" rx="2" />
          </svg>
          <p>Video lesson coming soon.</p>
          <span>This content is being produced and will be added shortly.</span>
        </div>
      ) : (
        <div className="w-part-body">
          <p className="w-part-placeholder-text">
            This lesson is being written. Check back soon for the full article on{' '}
            <em>{part.title}</em>.
          </p>
          <p className="w-part-placeholder-text w-part-placeholder-sub">
            In the meantime, mark this part as complete once you have reviewed any
            supporting materials, or return later when the content is live.
          </p>
        </div>
      )}

      {/* Notes */}
      <div className="w-part-notes">
        <label className="w-part-notes-label" htmlFor={`note-${part.id}`}>
          Your notes
        </label>
        <textarea
          id={`note-${part.id}`}
          className="w-part-notes-input"
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          onBlur={onNoteBlur}
          placeholder="Add a note for this part…"
          rows={3}
        />
      </div>

      {/* Completion */}
      <div className="w-part-footer">
        <label className="w-part-check-label">
          <input
            type="checkbox"
            className="w-part-check-input"
            checked={done}
            onChange={onToggle}
          />
          <span className="w-part-check-box" aria-hidden="true">
            {done && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </span>
          Mark as complete
        </label>
      </div>
    </section>
  );
}

// ---------- Main component ----------

export default function ChapterReader({
  course,
  chapter,
  chapterIndex,
  initialPartId,
}: ChapterReaderProps) {
  const { completedParts, notes, progressLoading, togglePart, updateNote, saveNoteNow } =
    useChapterProgress(course.courseId, chapter.id, chapter.parts, initialPartId);

  // Track which part is "active" (in view / scrolled to)
  const [activePartId, setActivePartId] = useState<string>(
    initialPartId || (chapter.parts[0]?.id ?? ''),
  );

  // Refs for each part section — used for scroll-to and IntersectionObserver
  const partRefs = useRef<Record<string, HTMLElement | null>>({});

  // Scroll to initialPartId on mount
  useEffect(() => {
    if (!initialPartId) return;
    const el = partRefs.current[initialPartId];
    if (el) {
      // Small delay so layout is fully painted before scrolling
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.focus({ preventScroll: true });
      }, 80);
    }
  }, [initialPartId]);

  // IntersectionObserver: track which part is in the viewport
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    chapter.parts.forEach(part => {
      const el = partRefs.current[part.id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActivePartId(part.id);
        },
        { threshold: 0.4 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [chapter.parts]);

  // Navigation helpers
  const prevChapter = chapterIndex > 0 ? course.chapters[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex < course.chapters.length - 1 ? course.chapters[chapterIndex + 1] : null;

  // "Continue" logic — find the first incomplete or next part after active
  const currentPartIndex = chapter.parts.findIndex(p => p.id === activePartId);
  const nextPartInChapter = chapter.parts[currentPartIndex + 1] ?? null;

  const handleContinue = () => {
    if (nextPartInChapter) {
      // Scroll to next part in chapter
      const el = partRefs.current[nextPartInChapter.id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActivePartId(nextPartInChapter.id);
      }
    }
    // Navigation to next chapter is handled via the Link below
  };

  const courseHref = `/world/courses/${course.courseId}`;

  return (
    <div className="w-chapter-reader">
      {/* ---- Breadcrumb ---- */}
      <nav className="w-reader-breadcrumb" aria-label="Breadcrumb">
        <Link href={courseHref} className="w-reader-breadcrumb-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Phase {course.phase}: {course.title}
        </Link>
        <span className="w-reader-breadcrumb-sep" aria-hidden="true">›</span>
        <span className="w-reader-breadcrumb-current">{chapter.title}</span>
      </nav>

      {/* ---- Chapter header ---- */}
      <header className="w-reader-header">
        <span className="w-reader-chapter-num">
          Chapter {chapterIndex + 1} of {course.chapters.length}
        </span>
        <h1 className="w-reader-title">{chapter.title}</h1>
        <p className="w-reader-meta">
          {chapter.parts.length} part{chapter.parts.length !== 1 ? 's' : ''}
          {!progressLoading && (
            <span className="w-reader-meta-done">
              {' '}·{' '}
              {chapter.parts.filter(p => completedParts.has(p.id)).length}/
              {chapter.parts.length} complete
            </span>
          )}
        </p>
      </header>

      {/* ---- Part list ---- */}
      <div className="w-reader-parts">
        {progressLoading ? (
          // Skeletons while progress loads
          chapter.parts.map(part => (
            <div key={part.id} className="w-chapter-part w-chapter-part-skeleton">
              <div className="w-skeleton w-skeleton-title" />
              <div className="w-skeleton w-skeleton-body" />
              <div className="w-skeleton w-skeleton-body w-skeleton-short" />
            </div>
          ))
        ) : (
          chapter.parts.map((part, pi) => (
            <PartBlock
              key={part.id}
              part={part}
              partIndex={pi}
              totalParts={chapter.parts.length}
              done={completedParts.has(part.id)}
              note={notes[part.id] ?? ''}
              onToggle={() => togglePart(part.id)}
              onNoteChange={v => updateNote(part.id, v)}
              onNoteBlur={() => saveNoteNow(part.id)}
              isActive={activePartId === part.id}
              partRef={el => { partRefs.current[part.id] = el; }}
            />
          ))
        )}
      </div>

      {/* ---- Continue / Next chapter ---- */}
      <div className="w-reader-nav-actions">
        {nextPartInChapter ? (
          <button className="w-btn w-btn-primary" onClick={handleContinue}>
            Continue
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        ) : nextChapter ? (
          <Link
            href={`/world/courses/${course.courseId}/${nextChapter.id}`}
            className="w-btn w-btn-primary"
          >
            Next chapter: {nextChapter.title}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        ) : (
          <Link href={courseHref} className="w-btn w-btn-primary">
            Back to course
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </Link>
        )}
      </div>

      {/* ---- Prev / Next chapter navigation ---- */}
      <nav className="w-reader-chapter-nav" aria-label="Chapter navigation">
        {prevChapter ? (
          <Link
            href={`/world/courses/${course.courseId}/${prevChapter.id}`}
            className="w-reader-chapter-nav-btn prev"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            <span>
              <span className="w-reader-nav-label">Previous</span>
              <span className="w-reader-nav-title">{prevChapter.title}</span>
            </span>
          </Link>
        ) : (
          <div />
        )}

        {nextChapter ? (
          <Link
            href={`/world/courses/${course.courseId}/${nextChapter.id}`}
            className="w-reader-chapter-nav-btn next"
          >
            <span>
              <span className="w-reader-nav-label">Next</span>
              <span className="w-reader-nav-title">{nextChapter.title}</span>
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </div>
  );
}
