import { describe, it, expect } from 'vitest';
import { cleanSentence, flowVerdictPrompt, newsTonePrompt, parseTones, regimePrompt } from '../aiText';

describe('AI layer text helpers (v1.15 Platform)', () => {
  it('cleans model output: quotes, markdown, whitespace', () => {
    expect(cleanSentence('  "**Neutral** market,\n  calm flows."  ')).toBe('Neutral market, calm flows.');
  });
  it('never lets the data provider name through', () => {
    expect(cleanSentence('Per CoinGlass data, the market is calm.')).toBeNull();
  });
  it('caps long output at a sentence end', () => {
    const s = cleanSentence(`${'Word '.repeat(40)}end. ${'More '.repeat(60)}`, 220)!;
    expect(s.length).toBeLessThanOrEqual(220);
    expect(s.endsWith('.')).toBe(true);
  });
  it('the regime prompt pins the computed verdict and forbids advice', () => {
    const p = regimePrompt({ verdict: 'Leaning Bullish', confidence: 0.67, fearGreed: 56, fearGreedLabel: 'Neutral', etf7dUsd: 298e6, pctLong: 61, liq24hUsd: 290e6 });
    expect(p).toContain('verdict (fixed, restate it, do not change it): Leaning Bullish (confidence 0.67)');
    expect(p).toContain('BTC ETF net flow, last 7 days: +$298M');
    expect(p).toMatch(/No advice to buy or sell/);
  });
  it('parses tone labels only when there is exactly one valid label per headline', () => {
    expect(parseTones('["bullish","Neutral","bearish"]', 3)).toEqual(['bullish', 'neutral', 'bearish']);
    expect(parseTones('Sure! ["bullish","bearish"]', 2)).toEqual(['bullish', 'bearish']);
    expect(parseTones('["bullish"]', 2)).toBeNull();
    expect(parseTones('["up","down"]', 2)).toBeNull();
    expect(parseTones('not json', 1)).toBeNull();
  });
  it('numbers the headlines in the tone prompt', () => {
    expect(newsTonePrompt(['ETF inflows jump', 'Exchange hacked'])).toContain('1. ETF inflows jump\n2. Exchange hacked');
  });
  it('flow verdict prompt pins the verdict and only passes the given facts', () => {
    const p = flowVerdictPrompt({ window: '4H', verdict: 'Distribution Wave', statLine: '$820M bearish vs $310M bullish', top: ['BTC Inflow $210M'] });
    expect(p).toContain('do not change it): Distribution Wave.');
    expect(p).toContain('Biggest events: BTC Inflow $210M.');
    expect(flowVerdictPrompt({ window: '1H', verdict: 'Quiet Flow', statLine: '0 events tracked', top: [] })).toContain('No large events.');
  });
});
