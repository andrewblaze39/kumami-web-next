/**
 * Shared helpers for /api/v1 routes (spec v1.13 Pro §23) — used by the website
 * and the Flutter app alike. Contract: docs/API.md.
 *   auth   : Authorization: Bearer <Firebase ID token>
 *   errors : { error: { code, message } } with a stable `code`
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { BillingNotConfigured } from '@/lib/billing/stripeClient';

export interface Caller {
  uid: string;
  email: string | null;
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fail(code: string, status: number, message?: string): NextResponse {
  return NextResponse.json({ error: { code, message: message ?? code } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export type TokenVerifier = (token: string) => Promise<{ uid: string; email?: string }>;

const defaultVerifier: TokenVerifier = (t) => adminAuth().verifyIdToken(t);

/** The signed-in caller, or a 401 response. */
export async function requireUser(req: Request, verify: TokenVerifier = defaultVerifier): Promise<Caller | NextResponse> {
  const caller = await optionalUser(req, verify);
  return caller ?? fail('unauthorized', 401, 'Sign in required (Authorization: Bearer <Firebase ID token>).');
}

/** The signed-in caller, or null when no / an invalid token is sent. */
export async function optionalUser(req: Request, verify: TokenVerifier = defaultVerifier): Promise<Caller | null> {
  const h = req.headers.get('Authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return null;
  try {
    const d = await verify(token);
    return { uid: d.uid, email: d.email ?? null };
  } catch {
    return null;
  }
}

/** Wrap a handler: unexpected errors become a logged 500, missing billing config a 503. */
export function handler<A extends unknown[]>(name: string, fn: (...args: A) => Promise<NextResponse>) {
  return async (...args: A): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof BillingNotConfigured) {
        console.error(`[api/v1 ${name}] ${e.message}`);
        return fail('billing_not_configured', 503, 'Payments are not configured on this server yet.');
      }
      console.error(`[api/v1 ${name}]`, e);
      return fail('internal', 500, 'Something went wrong. Please try again.');
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const b = await req.json().catch(() => null);
  return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
}

/** Public base URL for redirects and callbacks (APP_BASE_URL in hosted envs). */
export function baseUrl(req: Request): string {
  const env = process.env.APP_BASE_URL?.replace(/\/+$/, '');
  return env || new URL(req.url).origin;
}

/** Tiny per-instance fixed-window limiter (abuse brake, not a security boundary). */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimited(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const h = hits.get(key);
  if (!h || h.reset <= now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    return false;
  }
  h.n += 1;
  return h.n > max;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
