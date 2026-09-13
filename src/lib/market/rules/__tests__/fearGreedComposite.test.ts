import { describe, it, expect } from 'vitest';
import {
  scorePriceMomentum,
  scoreLongShortSentiment,
  scoreVolatility,
  scoreMarketComposition,
  scoreNewsTone,
  computeCompositeFearGreed,
  classifyComposite,
} from '../fearGreedComposite';

describe('scorePriceMomentum', () => {
  it('scores 95 (Extreme Greed range) for momentum > +20%', () => {
    expect(scorePriceMomentum(25)).toBe(95);
  });
  it('scores 5 (Extreme Fear range) for momentum < -20%', () => {
    expect(scorePriceMomentum(-25)).toBe(5);
  });
  it('scores neutral-ish for momentum within +-10%', () => {
    expect(scorePriceMomentum(0)).toBe(55);
  });
});

describe('scoreLongShortSentiment', () => {
  it('scores high (dangerous crowding) for > 75% long', () => {
    expect(scoreLongShortSentiment(80)).toBe(95);
  });
  it('scores low for < 25% long', () => {
    expect(scoreLongShortSentiment(20)).toBe(5);
  });
  it('scores mid-neutral for 45-55% long', () => {
    expect(scoreLongShortSentiment(50)).toBe(47);
  });
});

describe('scoreVolatility', () => {
  it('high vol ratio (>1.5) → Extreme Fear-range score, High label', () => {
    const r = scoreVolatility(1.8);
    expect(r.label).toBe('High');
    expect(r.score).toBeLessThan(15);
  });
  it('very low vol ratio (<0.7) → Extreme Greed-range score, Low label', () => {
    const r = scoreVolatility(0.5);
    expect(r.label).toBe('Low');
    expect(r.score).toBeGreaterThan(85);
  });
  it('vol ratio ~1.0 → Medium label, mid score', () => {
    const r = scoreVolatility(1.0);
    expect(r.label).toBe('Medium');
    expect(r.score).toBe(50);
  });
});

describe('scoreMarketComposition', () => {
  it('huge stablecoin inflow (dry powder building) → Extreme Fear score', () => {
    expect(scoreMarketComposition(6_000_000_000)).toBe(7);
  });
  it('huge stablecoin outflow (capital deployed) → Extreme Greed score', () => {
    expect(scoreMarketComposition(-6_000_000_000)).toBe(92);
  });
  it('roughly flat → neutral score', () => {
    expect(scoreMarketComposition(0)).toBe(50);
  });
});

describe('scoreNewsTone', () => {
  it('mostly bullish headlines → Extreme Greed-range score', () => {
    expect(scoreNewsTone(80)).toBe(92);
  });
  it('mostly bearish headlines → Extreme Fear-range score', () => {
    expect(scoreNewsTone(10)).toBe(8);
  });
});

describe('classifyComposite', () => {
  it('labels 0-24 Extreme Fear', () => {
    expect(classifyComposite(10).label).toBe('Extreme Fear');
  });
  it('labels 75-100 Extreme Greed', () => {
    expect(classifyComposite(90).label).toBe('Extreme Greed');
  });
  it('labels 46-55 Neutral', () => {
    expect(classifyComposite(50).label).toBe('Neutral');
  });
});

describe('computeCompositeFearGreed', () => {
  it('weights sub-metrics per the doc (0.30/0.20/0.15/0.20/0.15)', () => {
    const r = computeCompositeFearGreed({
      priceMomentum: 100,
      longShortSentiment: 100,
      volatility: 100,
      marketComposition: 100,
      newsTone: 100,
    });
    expect(r.score).toBe(100);
  });

  it('all zero sub-metrics → composite 0, Extreme Fear', () => {
    const r = computeCompositeFearGreed({
      priceMomentum: 0,
      longShortSentiment: 0,
      volatility: 0,
      marketComposition: 0,
      newsTone: 0,
    });
    expect(r.score).toBe(0);
    expect(r.label).toBe('Extreme Fear');
  });

  it('computes a correct weighted blend for mixed inputs', () => {
    const r = computeCompositeFearGreed({
      priceMomentum: 60,   // x0.30 = 18
      longShortSentiment: 40, // x0.20 = 8
      volatility: 50,      // x0.15 = 7.5
      marketComposition: 70, // x0.20 = 14
      newsTone: 30,        // x0.15 = 4.5
    });
    // sum = 52
    expect(r.score).toBe(52);
    expect(r.label).toBe('Neutral');
  });
});
