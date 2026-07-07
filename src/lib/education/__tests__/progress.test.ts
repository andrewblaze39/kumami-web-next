/**
 * Tests for src/lib/education/progress.ts
 * All Firestore deps are injected — no real Firebase.
 */

import { describe, it, expect } from 'vitest';
import { getUserCourseProgress } from '../progress';
import type { ProgressDeps, ProgressDoc } from '../progress';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(docs: Record<string, ProgressDoc | null>): ProgressDeps {
  return {
    async getDoc(path: string) {
      return docs[path] ?? null;
    },
  };
}

const TEST_UID = 'user-test-123';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getUserCourseProgress()', () => {
  it('returns 5 entries (one per phase) even when no progress exists', async () => {
    const result = await getUserCourseProgress(TEST_UID, makeDeps({}));
    expect(result).toHaveLength(5);
  });

  it('all entries have empty completedParts and null lastPartId when no docs exist', async () => {
    const result = await getUserCourseProgress(TEST_UID, makeDeps({}));
    for (const entry of result) {
      expect(entry.completedParts).toEqual([]);
      expect(entry.lastPartId).toBeNull();
    }
  });

  it('totalParts matches journeyData lesson counts (8/13/18/13/13)', async () => {
    const result = await getUserCourseProgress(TEST_UID, makeDeps({}));
    const totals = result.map(r => r.totalParts);
    expect(totals).toEqual([8, 13, 18, 13, 13]);
  });

  it('populates completedParts and lastPartId from Firestore doc', async () => {
    const docs = {
      [`course_progress/${TEST_UID}/courses/phase-1`]: {
        completedParts: ['p1-l1', 'p1-l2'],
        lastPartId: 'p1-l2',
      },
    };
    const result = await getUserCourseProgress(TEST_UID, makeDeps(docs));
    const phase1 = result.find(r => r.courseId === 'phase-1')!;
    expect(phase1.completedParts).toEqual(['p1-l1', 'p1-l2']);
    expect(phase1.lastPartId).toBe('p1-l2');
  });

  it('courseIds in response match journey phase slugs', async () => {
    const result = await getUserCourseProgress(TEST_UID, makeDeps({}));
    const ids = result.map(r => r.courseId);
    expect(ids).toEqual(['phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5']);
  });
});
