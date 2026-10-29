import { describe, it, expect } from 'vitest';
import { classifyFearGreed } from '../regime';
import { classifyComposite } from '../fearGreedComposite';

/**
 * Rachelle v1.17 Plus §4: one Fear & Greed index and ONE set of labels and colours everywhere
 * (Console tile, Console regime, Fear & Greed page, Daily Digest):
 *   0–24 Extreme Fear · 25–45 Fear · 46–55 Neutral · 56–74 Greed · 75–100 Extreme Greed
 *   Fear = red, Greed = green. The Console's older cut-offs (Greed from 60, Neutral 40–59)
 *   and its reversed colours are gone.
 */
describe('one Fear & Greed classification (v1.17)', () => {
  it.each([
    [0, 'Extreme Fear'], [24, 'Extreme Fear'],
    [25, 'Fear'], [45, 'Fear'],
    [46, 'Neutral'], [55, 'Neutral'],
    [56, 'Greed'], [74, 'Greed'],
    [75, 'Extreme Greed'], [100, 'Extreme Greed'],
  ])('%i → %s', (v, label) => {
    expect(classifyComposite(v).label).toBe(label);
    expect(classifyFearGreed(v).label).toBe(label);
  });

  it('fear reads red, greed reads green, neutral grey', () => {
    expect(classifyComposite(10).color).toBe('red');
    expect(classifyComposite(35).color).toBe('grey-red');
    expect(classifyComposite(50).color).toBe('grey');
    expect(classifyComposite(65).color).toBe('grey-green');
    expect(classifyComposite(90).color).toBe('green');
  });

  it('the Console classification is the same function for every value 0–100', () => {
    for (let v = 0; v <= 100; v++) expect(classifyFearGreed(v)).toEqual(classifyComposite(v));
  });

  it('the old Console cut-offs are gone (60 is Greed, 40 is Fear, 59 is Greed)', () => {
    expect(classifyFearGreed(40).label).toBe('Fear');
    expect(classifyFearGreed(59).label).toBe('Greed');
  });
});
