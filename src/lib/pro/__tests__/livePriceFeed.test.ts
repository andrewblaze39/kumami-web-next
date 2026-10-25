import { describe, expect, it } from "vitest";
import {
  mergeLivePrice,
  parseMiniTicker,
  priceFreshness,
} from "../livePriceFeed";

describe("live Binance price feed helpers", () => {
  it("parses one real combined-stream miniTicker and derives its matching 24h change", () => {
    expect(
      parseMiniTicker(
        {
          data: { e: "24hrMiniTicker", s: "SOLUSDT", c: "145.25", o: "148.83" },
        },
        1234,
      ),
    ).toEqual({
      symbol: "SOL",
      price: 145.25,
      change24h: expect.closeTo(-2.4054, 4),
      updatedAt: 1234,
    });
  });

  it("rejects malformed, non-USDT, or non-finite ticker values", () => {
    expect(
      parseMiniTicker({ data: { s: "SOLUSDC", c: "145.25", P: "-2.4" } }, 1),
    ).toBeNull();
    expect(
      parseMiniTicker({ data: { s: "SOLUSDT", c: "NaN", o: "148.83" } }, 1),
    ).toBeNull();
    expect(
      parseMiniTicker({ data: { s: "SOLUSDT", c: "0", o: "148.83" } }, 1),
    ).toBeNull();
    expect(
      parseMiniTicker({ data: { s: "SOLUSDT", c: "145.25" } }, 1),
    ).toBeNull();
  });

  it("only replaces the changed symbol and preserves earlier verified ticks", () => {
    const btc = {
      symbol: "BTC",
      price: 100_000,
      change24h: 1.2,
      updatedAt: 100,
    };
    const eth = {
      symbol: "ETH",
      price: 3_000,
      change24h: -0.2,
      updatedAt: 200,
    };
    expect(mergeLivePrice({ BTC: btc }, eth)).toEqual({ BTC: btc, ETH: eth });
  });

  it("labels live, stale, and unavailable price ages honestly", () => {
    expect(priceFreshness(10_000, 10_500)).toBe("live");
    expect(priceFreshness(10_000, 16_001)).toBe("stale");
    expect(priceFreshness(undefined, 16_001)).toBe("unavailable");
  });
});
