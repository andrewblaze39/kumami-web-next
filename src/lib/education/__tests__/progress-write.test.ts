/**
 * Tests for markPartDone() in src/lib/education/progress.ts
 *
 * All Firestore deps are injected — no real Firebase.
 * Tests cover: mark done, un-done, deduplication, lastPartId, notes, validation.
 */

import { describe, it, expect, vi } from 'vitest';
import { markPartDone } from '../progress';
import type { WriteProgressDeps, ProgressDoc } from '../progress';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps(initial: ProgressDoc | null = null): {
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
      // Simulate merge behaviour: spread existing + new fields
      stored = { ...(stored ?? {}), ...data } as ProgressDoc;
      written.push({ ...stored });
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
      // lastPartId preserved from previous state (p1-l2) — not reset
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
    // notes object may exist but should be empty (no key for this part)
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
// Write errors
// ---------------------------------------------------------------------------

describe('markPartDone() — write errors', () => {
  it('returns status 500 when setDoc throws', async () => {
    const errorDeps: WriteProgressDeps = {
      async getDoc() { return null; },
      async setDoc() { throw new Error('Firestore unavailable'); },
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
