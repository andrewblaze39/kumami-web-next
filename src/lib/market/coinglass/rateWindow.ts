/**
 * One shared CoinGlass budget (Rachelle v1.15 Platform): at most 70 calls per
 * rolling minute, under the plan's 80/min, so the collector and the pages never
 * trip the limit together. Back-off on HTTP 429 lives in client.ts.
 *
 * Per server instance — App Hosting can run more than one, which is why the cap
 * sits 10 below the plan limit and pages read caches instead of calling directly.
 */

export const CALLS_PER_MINUTE = 70;
const WINDOW_MS = 60_000;

/** How long to wait (ms) before the next call may start, given recent call times. Pure. */
export function waitBeforeNextCall(recent: number[], now: number, limit = CALLS_PER_MINUTE): number {
  const inWindow = recent.filter((t) => now - t < WINDOW_MS);
  if (inWindow.length < limit) return 0;
  const oldest = Math.min(...inWindow);
  return Math.max(0, oldest + WINDOW_MS - now);
}

const starts: number[] = [];

/** Resolve when a call may start, then record it. */
export async function takeSlot(now: () => number = Date.now): Promise<void> {
  for (;;) {
    const t = now();
    while (starts.length && t - starts[0] >= WINDOW_MS) starts.shift();
    const wait = waitBeforeNextCall(starts, t);
    if (wait === 0) {
      starts.push(t);
      return;
    }
    await new Promise((r) => setTimeout(r, wait + 5));
  }
}
