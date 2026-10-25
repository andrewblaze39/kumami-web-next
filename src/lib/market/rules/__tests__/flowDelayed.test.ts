import { describe, expect, it } from "vitest";
import type { FlowEvent } from "../../contracts";
import {
  delayedEvents,
  delayedFeedAsOf,
  isPlusEligible,
  lastSuccessfulCollection,
  plusVisibleAt,
} from "../flowDelayed";

const MIN = 60_000;
const now = Date.parse("2026-10-22T10:00:00Z");
const ev = (over: Partial<FlowEvent> = {}): FlowEvent =>
  ({
    id: "x",
    type: "whale_transfer",
    asset: "BTC",
    amountUsd: 50e6,
    direction: "Outflow",
    severity: "MED",
    description: "",
    ts: new Date(now).toISOString(),
    ...over,
  }) as FlowEvent;

describe("isPlusEligible", () => {
  it("core coins or market-wide, HIGH/MED, the 4 Plus types", () => {
    expect(isPlusEligible(ev())).toBe(true);
    expect(isPlusEligible(ev({ asset: "PEPE" }))).toBe(false);
    expect(
      isPlusEligible(
        ev({ asset: "USDT", type: "exchange_flow", marketWide: true }),
      ),
    ).toBe(true);
    expect(isPlusEligible(ev({ severity: "LOW" }))).toBe(false);
    expect(isPlusEligible(ev({ type: "netflow_flip" }))).toBe(false);
  });
});

describe("plusVisibleAt", () => {
  it("new event: the earlier of its own time and now (found late = already old)", () => {
    expect(
      plusVisibleAt(
        undefined,
        ev({ ts: new Date(now - 30 * MIN).toISOString() }),
        now,
      ),
    ).toBe(now - 30 * MIN);
    expect(
      plusVisibleAt(
        undefined,
        ev({ ts: new Date(now + MIN).toISOString() }),
        now,
      ),
    ).toBe(now);
  });
  it("keeps the first plusAt on later sightings", () => {
    expect(plusVisibleAt({ plusAt: now - 5 * MIN }, ev(), now)).toBe(
      now - 5 * MIN,
    );
  });
  it("an event that grows into MED becomes visible from that moment", () => {
    expect(
      plusVisibleAt(
        {},
        ev({ ts: new Date(now - 40 * MIN).toISOString() }),
        now,
      ),
    ).toBe(now);
  });
  it("not eligible → undefined", () => {
    expect(
      plusVisibleAt(undefined, ev({ severity: "LOW" }), now),
    ).toBeUndefined();
  });
});

describe("delayed feed freshness", () => {
  it("uses legacy lastRun metadata until the first new success record exists", () => {
    expect(lastSuccessfulCollection({ lastRun: now - MIN })).toBe(now - MIN);
    expect(
      lastSuccessfulCollection({
        lastRun: now - MIN,
        lastAttemptAt: now - MIN,
      }),
    ).toBeNull();
    expect(
      lastSuccessfulCollection({
        lastSuccessAt: now - 2 * MIN,
        lastRun: now - MIN,
      }),
    ).toBe(now - 2 * MIN);
  });

  it("uses the last successful collection rather than inventing a current delayed timestamp", () => {
    expect(delayedFeedAsOf(now, now - 3 * 60 * MIN, 15 * MIN)).toBe(
      now - 3 * 60 * MIN - 15 * MIN,
    );
  });
});

describe("delayedEvents", () => {
  const delay = 15 * MIN;
  it("only events visible for 15+ min, newest first", () => {
    const out = delayedEvents(
      [
        {
          ...ev({ id: "old", ts: new Date(now - 60 * MIN).toISOString() }),
          plusAt: now - 60 * MIN,
        },
        {
          ...ev({ id: "fresh", ts: new Date(now - 5 * MIN).toISOString() }),
          plusAt: now - 5 * MIN,
        },
        {
          ...ev({ id: "mid", ts: new Date(now - 20 * MIN).toISOString() }),
          plusAt: now - 20 * MIN,
        },
      ],
      now,
      delay,
    );
    expect(out.map((e) => e.id)).toEqual(["mid", "old"]);
    expect(out[0]).not.toHaveProperty("plusAt");
  });
  it("a re-stamped hourly event shows no later than when it became visible", () => {
    const [e] = delayedEvents(
      [
        {
          ...ev({ type: "liq_spike", ts: new Date(now).toISOString() }),
          plusAt: now - 20 * MIN,
        },
      ],
      now,
      delay,
    );
    expect(e.ts).toBe(new Date(now - 20 * MIN).toISOString());
  });
});
