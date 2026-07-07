/**
 * Tests for markPartDone() in src/lib/education/progress.ts
 *
 * All Firestore deps are injected — no real Firebase.
 * Tests cover: mark done, un-done, deduplication, lastPartId, notes, validation,
 * note-only saves (I2), undefined-not-written-to-Firestore (I3),
 * course-doc part validation (I4), note cap (I5).
 */

import { describe, it, expect, vi } from 'vitest';
import { markPartDone } from '../progress';
import type { WriteProgressDeps, ProgressDoc } from '../progress';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(
  initial: ProgressDoc | null = null,
  partIds?: string[],
): {
  deps: WriteProgressDeps;
  written: ProgressDoc[];
} {
  const written: ProgressDoc[] = [];
  let stored: ProgressDoc | null = initial;

  const deps: WriteProgressDeps = {
    async getDoc() {
      return stored;
    },
    async setDoc(_path, data) {
      // I3 regression: reject undefined values (mimics firebase-admin behaviour)
      const hasUndefined = Object.values(data).some(v => v === undefined);
      if (hasUndefined) throw new Error('firebase-admin: undefined value in payload');
      // Simulate merge behaviour: spread existing + new fields
      stored = { ...(stored ?? {}), ...data } as ProgressDoc;
      written.push({ ...stored });
    },
    // I4: injectable getCoursePartIds
    async getCoursePartIds(_courseId: string) {
      return partIds ?? null; // null → fall back to journeyData
    },
  };

  return { deps, written };
}

const UID = 'u-test';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('markPartDone() — validation', () => {
  it('returns 400 for unknown courseId', async () => {
    const { deps } = makeDeps();
    const result = await markPartDone(UID, { courseId: 'phase-99', partId: 'p1-l1', done: true }, deps);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/courseId/i);
    }
  });

  it('returns 400 for unknown partId within a valid course', async () => {
    const { deps } = makeDeps();
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p99-l99', done: true }, deps);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/partId/i);
    }
  });

  it('accepts a valid courseId + partId pair', async () => {
    const { deps } = makeDeps();
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: true }, deps);
    expect(result.success).toBe(true);
  });

  it('accepts a partId from phase-2', async () => {
    const { deps } = makeDeps();
    const result = await markPartDone(UID, { courseId: 'phase-2', partId: 'p2-l5', done: true }, deps);
    expect(result.success).toBe(true);
  });

  // I4: validate against actual course doc parts (injected)
  it('(I4) accepts a partId present in the injected course doc but NOT in journeyData', async () => {
    // Simulate a seeded course with a custom part id
    const { deps } = makeDeps(null, ['custom-part-1', 'custom-part-2']);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'custom-part-1', done: true }, deps);
    expect(result.success).toBe(true);
  });

  it('(I4) rejects a partId absent from the injected course doc', async () => {
    const { deps } = makeDeps(null, ['custom-part-1']);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: true }, deps);
    // p1-l1 is NOT in the custom list
    expect(result.success).toBe(false);
    if (!result.success) expect(result.status).toBe(400);
  });

  it('(I4) falls back to journeyData when getCoursePartIds returns null', async () => {
    // null return → falls back to journeyData; p1-l1 is valid in journeyData
    const { deps } = makeDeps(null, undefined); // undefined → null return
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: true }, deps);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mark done
// ---------------------------------------------------------------------------

describe('markPartDone() — mark done', () => {
  it('adds partId to completedParts when done=true', async () => {
    const { deps } = makeDeps();
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: true }, deps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.completedParts).toContain('p1-l1');
    }
  });

  it('sets lastPartId to the marked partId when done=true', async () => {
    const { deps } = makeDeps();
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l3', done: true }, deps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.lastPartId).toBe('p1-l3');
    }
  });

  it('deduplicates — marking already-done part does not duplicate', async () => {
    const initial: ProgressDoc = { completedParts: ['p1-l1'], lastPartId: 'p1-l1' };
    const { deps } = makeDeps(initial);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: true }, deps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.completedParts.filter(id => id === 'p1-l1')).toHaveLength(1);
    }
  });

  it('accumulates multiple parts', async () => {
    const initial: ProgressDoc = { completedParts: ['p1-l1'] };
    const { deps } = makeDeps(initial);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l2', done: true }, deps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.completedParts).toContain('p1-l1');
      expect(result.completedParts).toContain('p1-l2');
      expect(result.completedParts).toHaveLength(2);
    }
  });
});

// ---------------------------------------------------------------------------
// Mark un-done
// ---------------------------------------------------------------------------

describe('markPartDone() — mark un-done', () => {
  it('removes partId from completedParts when done=false', async () => {
    const initial: ProgressDoc = { completedParts: ['p1-l1', 'p1-l2'], lastPartId: 'p1-l2' };
    const { deps } = makeDeps(initial);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: false }, deps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.completedParts).not.toContain('p1-l1');
      expect(result.completedParts).toContain('p1-l2');
    }
  });

  it('does not change lastPartId when un-marking a part', async () => {
    const initial: ProgressDoc = { completedParts: ['p1-l1', 'p1-l2'], lastPartId: 'p1-l2' };
    const { deps } = makeDeps(initial);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: false }, deps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.lastPartId).toBe('p1-l2');
    }
  });

  it('handles removing a part that was not in completedParts (no-op)', async () => {
    const { deps } = makeDeps();
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l3', done: false }, deps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.completedParts).toHaveLength(0);
    }
  });

  // I3: regression — un-mark with no prior doc should not write undefined
  it('(I3) un-mark with no prior doc does not throw / write undefined', async () => {
    const { deps, written } = makeDeps(null); // no prior doc
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: false }, deps);
    expect(result.success).toBe(true);
    const saved = written[written.length - 1];
    // lastPartId must not be present (null → omitted) or undefined
    expect(saved.lastPartId).toBeUndefined(); // key should not exist at all
    // completedParts must be defined
    expect(saved.completedParts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Note-only save (I2)
// ---------------------------------------------------------------------------

describe('markPartDone() — note-only (done=undefined)', () => {
  it('(I2) saves note without touching completedParts when done is undefined', async () => {
    const initial: ProgressDoc = { completedParts: ['p1-l1', 'p1-l2'], lastPartId: 'p1-l2' };
    const { deps, written } = makeDeps(initial);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', note: 'just a note' }, deps);
    expect(result.success).toBe(true);
    if (result.success) {
      // completedParts unchanged
      expect(result.completedParts).toEqual(['p1-l1', 'p1-l2']);
    }
    const saved = written[written.length - 1];
    expect(saved.notes?.['p1-l1']).toBe('just a note');
    // lastPartId not promoted (done=undefined → no change)
    expect(saved.lastPartId).toBe('p1-l2');
  });

  it('(I2) note-only payload does not write undefined to Firestore (I3 check)', async () => {
    const { deps, written } = makeDeps(null);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', note: 'hi' }, deps);
    expect(result.success).toBe(true);
    const saved = written[0];
    // lastPartId key must not be present (was null, should be omitted)
    expect('lastPartId' in saved).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

describe('markPartDone() — notes', () => {
  it('saves a note when note is provided', async () => {
    const { deps, written } = makeDeps();
    const result = await markPartDone(
      UID,
      { courseId: 'phase-1', partId: 'p1-l1', done: true, note: 'Great lesson!' },
      deps,
    );
    expect(result.success).toBe(true);
    const saved = written[written.length - 1];
    expect(saved.notes?.['p1-l1']).toBe('Great lesson!');
  });

  it('preserves existing notes for other parts when adding a new note', async () => {
    const initial: ProgressDoc = {
      completedParts: ['p1-l1'],
      notes: { 'p1-l1': 'First note' },
    };
    const { deps, written } = makeDeps(initial);
    await markPartDone(
      UID,
      { courseId: 'phase-1', partId: 'p1-l2', done: true, note: 'Second note' },
      deps,
    );
    const saved = written[written.length - 1];
    expect(saved.notes?.['p1-l1']).toBe('First note');
    expect(saved.notes?.['p1-l2']).toBe('Second note');
  });

  it('does not write a notes key when note is undefined', async () => {
    const { deps, written } = makeDeps();
    await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: true }, deps);
    const saved = written[written.length - 1];
    expect(saved.notes?.['p1-l1']).toBeUndefined();
  });

  it('updates an existing note on the same partId', async () => {
    const initial: ProgressDoc = {
      completedParts: ['p1-l1'],
      notes: { 'p1-l1': 'Old note' },
    };
    const { deps, written } = makeDeps(initial);
    await markPartDone(
      UID,
      { courseId: 'phase-1', partId: 'p1-l1', done: true, note: 'New note' },
      deps,
    );
    const saved = written[written.length - 1];
    expect(saved.notes?.['p1-l1']).toBe('New note');
  });

  it('clears a note when note is empty string', async () => {
    const initial: ProgressDoc = {
      completedParts: ['p1-l1'],
      notes: { 'p1-l1': 'Had a note' },
    };
    const { deps, written } = makeDeps(initial);
    await markPartDone(
      UID,
      { courseId: 'phase-1', partId: 'p1-l1', done: true, note: '' },
      deps,
    );
    const saved = written[written.length - 1];
    expect(saved.notes?.['p1-l1']).toBe('');
  });
});

// ---------------------------------------------------------------------------
// I3: undefined never written to Firestore
// ---------------------------------------------------------------------------

describe('markPartDone() — I3: no undefined in Firestore payload', () => {
  it('does not include lastPartId in payload when done=false and no prior doc', async () => {
    // The mock setDoc throws if it receives undefined — this test ensures it does not throw
    const { deps, written } = makeDeps(null);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: false }, deps);
    expect(result.success).toBe(true);
    // lastPartId must be absent from the written payload (not undefined)
    expect(written[0]).not.toHaveProperty('lastPartId');
  });

  it('does not include lastPartId in payload when done=undefined and no prior doc', async () => {
    const { deps, written } = makeDeps(null);
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', note: 'test' }, deps);
    expect(result.success).toBe(true);
    expect(written[0]).not.toHaveProperty('lastPartId');
  });
});

// ---------------------------------------------------------------------------
// I5: Note length cap
// ---------------------------------------------------------------------------

describe('markPartDone() — I5: note length cap', () => {
  const NOTE_CAP = 5000;

  it('rejects a note exceeding 5000 chars with error note_too_long', async () => {
    const { deps } = makeDeps();
    const longNote = 'x'.repeat(NOTE_CAP + 1);
    const result = await markPartDone(
      UID,
      { courseId: 'phase-1', partId: 'p1-l1', done: true, note: longNote },
      deps,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toBe('note_too_long');
    }
  });

  it('accepts a note exactly at the cap length', async () => {
    const { deps } = makeDeps();
    const exactNote = 'x'.repeat(NOTE_CAP);
    const result = await markPartDone(
      UID,
      { courseId: 'phase-1', partId: 'p1-l1', done: true, note: exactNote },
      deps,
    );
    expect(result.success).toBe(true);
  });

  it('accepts a note of 0 chars (empty string)', async () => {
    const { deps } = makeDeps();
    const result = await markPartDone(
      UID,
      { courseId: 'phase-1', partId: 'p1-l1', done: true, note: '' },
      deps,
    );
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Write errors
// ---------------------------------------------------------------------------

describe('markPartDone() — write errors', () => {
  it('returns status 500 when setDoc throws', async () => {
    const errorDeps: WriteProgressDeps = {
      async getDoc() { return null; },
      async setDoc() { throw new Error('Firestore unavailable'); },
      async getCoursePartIds() { return null; },
    };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await markPartDone(UID, { courseId: 'phase-1', partId: 'p1-l1', done: true }, errorDeps);
    consoleSpy.mockRestore();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(500);
    }
  });
});
