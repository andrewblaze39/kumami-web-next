import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONSOLE_ANCHORS, consoleAssetPool, sanitizeConsoleAssets } from '../consoleAssets';

describe('consoleAssetPool', () => {
  it('lists the anchors first, then the Watchlist coins, without duplicates', () => {
    expect(consoleAssetPool(['link', 'BTC', 'DOGE'])).toEqual([...CONSOLE_ANCHORS, 'LINK', 'DOGE']);
  });
});

describe('sanitizeConsoleAssets', () => {
  const pool = consoleAssetPool(['LINK', 'DOGE', 'SUI']);

  it('keeps known coins in order, upper-cased, without duplicates', () => {
    expect(sanitizeConsoleAssets(['eth', 'LINK', 'ETH'], pool)).toEqual(['ETH', 'LINK']);
  });

  it('drops coins outside the pool and caps at 5', () => {
    expect(sanitizeConsoleAssets(['PEPE', 'BTC', 'ETH', 'SOL', 'BNB', 'HYPE', 'LINK'], pool)).toEqual(['BTC', 'ETH', 'SOL', 'BNB', 'HYPE']);
  });

  it('returns null when nothing valid is left', () => {
    expect(sanitizeConsoleAssets(['PEPE'], pool)).toBeNull();
    expect(sanitizeConsoleAssets([], pool)).toBeNull();
    expect(sanitizeConsoleAssets('BTC', pool)).toBeNull();
    expect(sanitizeConsoleAssets([1, null], pool)).toBeNull();
  });
});

describe('Console Pro sources', () => {
  const read = (p: string) => readFileSync(path.resolve(__dirname, '../../../../components/world', p), 'utf8');

  it('reads Calendar Pro through the tier-filtered route, never pro_calendar directly', () => {
    const src = read('panels/CalendarPreview.tsx');
    expect(src).not.toMatch(/['"`]pro_calendar['"`]/);
    expect(src).toContain("'/api/market/calendar?view=pro'");
  });

  it('uses the real-time Flow Radar Pro feed', () => {
    expect(read('pro/tabs/ConsolePro.tsx')).toContain("'/api/market/flow-radar?view=pro'");
  });
});
