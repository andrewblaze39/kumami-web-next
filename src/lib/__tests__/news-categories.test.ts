import { describe, it, expect } from 'vitest';
import { getNewsCategories } from '@/lib/news';

describe('getNewsCategories', () => {
  it('orders categories by frequency desc, then alphabetically', () => {
    const articles = [
      { category: 'Markets' },
      { category: 'Regulation' },
      { category: 'Markets' },
      { category: 'Airdrops' },
      { category: 'Regulation' },
      { category: 'Markets' },
    ];
    expect(getNewsCategories(articles)).toEqual([
      'Markets', // 3
      'Regulation', // 2
      'Airdrops', // 1
    ]);
  });

  it('breaks frequency ties alphabetically', () => {
    const articles = [
      { category: 'Web3' },
      { category: 'Bitcoin' },
      { category: 'Macro' },
    ];
    expect(getNewsCategories(articles)).toEqual(['Bitcoin', 'Macro', 'Web3']);
  });

  it('trims whitespace and drops empty/undefined categories', () => {
    const articles = [
      { category: '  Markets  ' },
      { category: 'Markets' },
      { category: '   ' },
      { category: '' },
      { category: undefined },
      {},
    ];
    expect(getNewsCategories(articles)).toEqual(['Markets']);
  });

  it('dedupes identical trimmed values', () => {
    const articles = [
      { category: 'DeFi' },
      { category: ' DeFi' },
      { category: 'DeFi ' },
    ];
    expect(getNewsCategories(articles)).toEqual(['DeFi']);
  });

  it('returns empty array for no articles', () => {
    expect(getNewsCategories([])).toEqual([]);
  });
});
