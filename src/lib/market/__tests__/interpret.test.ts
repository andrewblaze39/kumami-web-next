/**
 * Tests for src/lib/market/llm/interpret.ts
 * - Returns non-empty string for every MetricPanelKey + generic fallback
 * - Includes verdict label from context
 * - Deterministic (same input → same output)
 */
import { describe, it, expect } from 'vitest';
import { interpret } from '../llm/interpret';
import type { MetricPanelKey } from '../contracts';

const ALL_PANELS: MetricPanelKey[] = [
  'funding',
  'liquidations',
  'netflow',
  'longshort',
  'heatmap',
  'cvd',
  'premium',
  'etf',
  'oi',
  'stablecoin',
];

const baseContext = {
  verdict: { label: 'Crowded Long', color: 'amber' },
  tags: [],
};

// ---------------------------------------------------------------------------
// Non-empty string per panel
// ---------------------------------------------------------------------------
describe('interpret — returns non-empty string per panel key', () => {
  for (const panel of ALL_PANELS) {
    it(`panel "${panel}" returns non-empty string`, async () => {
      const result = await interpret(panel, baseContext);
      expect(typeof result).toBe('string');
      expect(result.trim().length).toBeGreaterThan(0);
    });
  }

  it('generic fallback for unknown panel key returns non-empty string', async () => {
    const result = await interpret('unknown_panel', baseContext);
    expect(result.trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Includes verdict label from context
// ---------------------------------------------------------------------------
describe('interpret — includes verdict label', () => {
  it('funding: output contains verdict label', async () => {
    const result = await interpret('funding', {
      verdict: { label: 'Overheated Long', color: 'red' },
      tags: [],
    });
    expect(result).toContain('Overheated Long');
  });

  it('liquidations: output contains verdict label', async () => {
    const result = await interpret('liquidations', {
      verdict: { label: 'Mass Long Flush', color: 'green' },
      tags: [],
    });
    expect(result).toContain('Mass Long Flush');
  });

  it('netflow: output contains verdict label', async () => {
    const result = await interpret('netflow', {
      verdict: { label: 'Strong Accumulation', color: 'green' },
      tags: [],
    });
    expect(result).toContain('Strong Accumulation');
  });

  it('generic: output contains verdict label', async () => {
    const result = await interpret('unknown_panel', {
      verdict: { label: 'Custom Label', color: 'grey' },
      tags: [],
    });
    expect(result).toContain('Custom Label');
  });
});

// ---------------------------------------------------------------------------
// Deterministic — same input produces same output
// ---------------------------------------------------------------------------
describe('interpret — deterministic', () => {
  for (const panel of ALL_PANELS) {
    it(`panel "${panel}" is deterministic`, async () => {
      const ctx = { verdict: { label: 'Neutral', color: 'grey' }, tags: [] };
      const r1 = await interpret(panel, ctx);
      const r2 = await interpret(panel, ctx);
      expect(r1).toBe(r2);
    });
  }
});

// ---------------------------------------------------------------------------
// Context fields used in templates
// ---------------------------------------------------------------------------
describe('interpret — uses context fields where available', () => {
  it('funding: uses fundingRate from context when provided', async () => {
    const result = await interpret('funding', {
      verdict: { label: 'Crowded Long', color: 'amber' },
      tags: [],
      fundingRate: 0.08,
    });
    expect(result).toContain('0.08');
  });

  it('etf: uses flowUsd from context when provided', async () => {
    const result = await interpret('etf', {
      verdict: { label: 'Solid ETF Inflow', color: 'green' },
      tags: [],
      flowUsd: 320,
    });
    expect(result).toContain('320');
  });
});
