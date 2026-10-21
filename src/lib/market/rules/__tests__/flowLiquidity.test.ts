import { describe, expect, it } from 'vitest';
import { binanceUsdtVolumes, filterIlliquid, spotVolumeMap } from '../flowLiquidity';

const ev = (asset: string, marketWide = false) => ({ asset, marketWide });

describe('flowLiquidity', () => {
  const volumes = spotVolumeMap([
    { symbol: 'PEPE', taker_buy_volume_usd_24h: 40e6, taker_sell_volume_usd_24h: 38e6 },
    { symbol: 'THIN', taker_buy_volume_usd_24h: 300e3, taker_sell_volume_usd_24h: 200e3 },
  ]);
  const binance = binanceUsdtVolumes([
    { symbol: 'MIDUSDT', quoteVolume: '3500000' },
    { symbol: 'TINYUSDT', quoteVolume: '200000' },
    { symbol: 'THINUSDT', quoteVolume: '9000000' },
    { symbol: 'MIDBTC', quoteVolume: '99' },
  ]);

  it('reads Binance USDT pairs only', () => {
    expect(binance).toEqual({ MID: 3.5e6, TINY: 2e5, THIN: 9e6 });
  });

  it('list coins use the list volume; missing coins fall back to Binance; missing from both are hidden', () => {
    const out = filterIlliquid([ev('PEPE'), ev('THIN'), ev('MID'), ev('TINY'), ev('NOWHERE')], volumes, binance).map((e) => e.asset);
    expect(out).toEqual(['PEPE', 'MID']); // THIN: the list says $0.5M, Binance doesn't override it
  });

  it('core assets, stablecoins and market-wide events are never hidden', () => {
    expect(filterIlliquid([ev('HYPE'), ev('USDT'), ev('X', true)], volumes, null)).toHaveLength(3);
  });

  it('no list data → nothing hidden; no Binance data → the strict list rule', () => {
    expect(filterIlliquid([ev('NOWHERE')], null, binance)).toHaveLength(1);
    expect(filterIlliquid([ev('MID')], volumes, null)).toHaveLength(0);
  });
});
