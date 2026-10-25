export type CollectorLeaseMeta = {
  since?: number;
  lastRun?: number;
  lastAttemptAt?: number;
  leaseId?: string;
  leaseUntil?: number;
};

export type CollectorLeaseDecision =
  | {
      kind: "acquired";
      patch: Required<
        Pick<CollectorLeaseMeta, "since" | "lastRun" | "leaseId" | "leaseUntil">
      > & { lastAttemptAt: number };
    }
  | { kind: "busy"; retryAt: number }
  | { kind: "fresh"; retryAt: number };

export function ownsCollectorLease(
  meta: CollectorLeaseMeta | undefined,
  runId: string,
): boolean {
  return meta?.leaseId === runId;
}

/**
 * Pure lease decision used inside a Firestore transaction. A caller must persist
 * an `acquired` patch atomically; otherwise simultaneous callers could both run.
 */
export function decideCollectorLease(
  meta: CollectorLeaseMeta | undefined,
  now: number,
  runId: string,
  leaseMs: number,
  skipIfAttemptWithinMs = 0,
): CollectorLeaseDecision {
  if (meta?.leaseUntil !== undefined && meta.leaseUntil > now)
    return { kind: "busy", retryAt: meta.leaseUntil };
  const lastAttemptAt = meta?.lastAttemptAt ?? meta?.lastRun;
  if (
    skipIfAttemptWithinMs > 0 &&
    lastAttemptAt !== undefined &&
    now - lastAttemptAt < skipIfAttemptWithinMs
  ) {
    return { kind: "fresh", retryAt: lastAttemptAt + skipIfAttemptWithinMs };
  }
  return {
    kind: "acquired",
    patch: {
      since: meta?.since ?? now,
      lastRun: now,
      lastAttemptAt: now,
      leaseId: runId,
      leaseUntil: now + leaseMs,
    },
  };
}
