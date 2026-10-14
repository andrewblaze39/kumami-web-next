'use client';
/**
 * Browser helper for /api/v1 — attaches the Firebase ID token, retries once
 * with a fresh token on 401, and turns { error: { code, message } } into an
 * ApiError. Same contract the Flutter app uses (docs/API.md).
 */
import { auth } from '@/lib/firebase';

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
  }
}

export async function v1<T>(path: string, init: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const call = async (fresh: boolean) => {
    const headers: Record<string, string> = {};
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (init.auth !== false && auth.currentUser) headers.Authorization = `Bearer ${await auth.currentUser.getIdToken(fresh)}`;
    return fetch(`/api/v1${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  };
  let res = await call(false);
  if (res.status === 401 && auth.currentUser && init.auth !== false) res = await call(true);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(e?.code ?? 'http_error', e?.message ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export interface SubscriptionSummaryDto {
  isPro: boolean;
  source: 'stripe' | 'crypto' | 'admin' | null;
  plan: 'monthly' | 'yearly' | null;
  status: string | null;
  proUntil: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canCancel: boolean;
  canResume: boolean;
  canUpdateCard: boolean;
  showRenewReminder: boolean;
}

export interface ReferralDto {
  code: string;
  links: { web: string; app: string };
  referralCount: number;
  balanceCents: number;
  rewards: Record<string, number>;
  withdrawalsAvailable: boolean;
  ledger: { id: string; amountCents: number; type: string; reason: string | null; createdAt: string }[];
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
