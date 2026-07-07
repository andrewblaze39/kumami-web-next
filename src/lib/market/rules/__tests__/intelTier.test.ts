import { describe, it, expect } from 'vitest';
import { computeIntelTier } from '../intelTier';

// Doc lines 1014–1041.
// Impact × timing matrix:
//   high   + now       → A (red)
//   high   + scheduled → B (amber)
//   high   + evergreen → C (grey)  — evergreen always C
//   medium + now       → B (amber)
//   medium + scheduled → B (amber) — documented decision (medium ceiling B)
//   medium + evergreen → C (grey)
//   low    + now       → C (grey)
//   low    + scheduled → C (grey)
//   low    + evergreen → C (grey)

describe('computeIntelTier — high impact', () => {
  it('High + now → A (red)', () => {
    const r = computeIntelTier({ impact: 'high', timing: 'now' });
    expect(r.tier).toBe('A');
    expect(r.verdict.color).toBe('red');
    expect(r.verdict.label).toBe('A');
  });

  it('High + scheduled → B (amber)', () => {
    const r = computeIntelTier({ impact: 'high', timing: 'scheduled' });
    expect(r.tier).toBe('B');
    expect(r.verdict.color).toBe('amber');
  });

  it('High + evergreen → C (grey) — evergreen always downgrades', () => {
    const r = computeIntelTier({ impact: 'high', timing: 'evergreen' });
    expect(r.tier).toBe('C');
    expect(r.verdict.color).toBe('grey');
  });
});

describe('computeIntelTier — medium impact', () => {
  it('Medium + now → B (amber)', () => {
    const r = computeIntelTier({ impact: 'medium', timing: 'now' });
    expect(r.tier).toBe('B');
    expect(r.verdict.color).toBe('amber');
  });

  it('Medium + scheduled → B (amber) — medium ceiling is B', () => {
    const r = computeIntelTier({ impact: 'medium', timing: 'scheduled' });
    expect(r.tier).toBe('B');
    expect(r.verdict.color).toBe('amber');
  });

  it('Medium + evergreen → C (grey)', () => {
    const r = computeIntelTier({ impact: 'medium', timing: 'evergreen' });
    expect(r.tier).toBe('C');
    expect(r.verdict.color).toBe('grey');
  });
});

describe('computeIntelTier — low impact', () => {
  it('Low + now → C (grey) — low always C', () => {
    const r = computeIntelTier({ impact: 'low', timing: 'now' });
    expect(r.tier).toBe('C');
    expect(r.verdict.color).toBe('grey');
  });

  it('Low + scheduled → C (grey)', () => {
    const r = computeIntelTier({ impact: 'low', timing: 'scheduled' });
    expect(r.tier).toBe('C');
  });

  it('Low + evergreen → C (grey)', () => {
    const r = computeIntelTier({ impact: 'low', timing: 'evergreen' });
    expect(r.tier).toBe('C');
  });
});

describe('computeIntelTier — verdict and tags structure', () => {
  it('verdict label matches tier letter', () => {
    const a = computeIntelTier({ impact: 'high', timing: 'now' });
    expect(a.verdict.label).toBe('A');

    const b = computeIntelTier({ impact: 'medium', timing: 'now' });
    expect(b.verdict.label).toBe('B');

    const c = computeIntelTier({ impact: 'low', timing: 'now' });
    expect(c.verdict.label).toBe('C');
  });

  it('tags are always empty (no modifier tags defined in doc)', () => {
    const r = computeIntelTier({ impact: 'high', timing: 'now' });
    expect(r.tags).toHaveLength(0);
  });

  it('all 9 cells produce non-null tier', () => {
    const impacts = ['high', 'medium', 'low'] as const;
    const timings = ['now', 'scheduled', 'evergreen'] as const;
    for (const impact of impacts) {
      for (const timing of timings) {
        const r = computeIntelTier({ impact, timing });
        expect(['A', 'B', 'C']).toContain(r.tier);
      }
    }
  });
});
