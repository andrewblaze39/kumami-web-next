import { describe, it, expect } from 'vitest';
import { flowEmptyMessage } from '../flowEmpty';

// Rachelle v1.17 Plus §3: when no HIGH/MED events fall in the selected window, Flow Radar Plus
// says "No major flows in the last {window} — market is quiet" instead of an empty list.
describe('flowEmptyMessage', () => {
  it('Plus, nothing in the window: the quiet-market line, per window', () => {
    expect(flowEmptyMessage({ plus: true, eventsInWindow: 0, timeframe: '1H' })).toBe('No major flows in the last hour — market is quiet');
    expect(flowEmptyMessage({ plus: true, eventsInWindow: 0, timeframe: '4H' })).toBe('No major flows in the last 4 hours — market is quiet');
    expect(flowEmptyMessage({ plus: true, eventsInWindow: 0, timeframe: '24H' })).toBe('No major flows in the last 24 hours — market is quiet');
  });

  it('events exist but the user\'s filters hide them: say so', () => {
    expect(flowEmptyMessage({ plus: true, eventsInWindow: 3, timeframe: '4H' })).toBe('No events match these filters right now.');
    expect(flowEmptyMessage({ plus: false, eventsInWindow: 3, timeframe: '4H' })).toBe('No events match these filters right now.');
  });

  it('Pro keeps its neutral empty line', () => {
    expect(flowEmptyMessage({ plus: false, eventsInWindow: 0, timeframe: '7D' })).toBe('No events in the last 7 days.');
  });
});
