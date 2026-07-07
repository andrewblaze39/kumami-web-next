/**
 * src/lib/market/api-helpers.ts — shared auth + tier helpers for market API routes.
 *
 * Extracts the Authorization Bearer token, verifies it, then resolves the user
 * tier. Both the token verifier and the gating deps are injectable so unit tests
 * never touch real Firebase.
 */

import 'server-only';

import { NextResponse } from 'next/server';
import { resolveTier, type GatingDeps, type Tier } from './gating';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result on success — caller receives uid + resolved tier. */
export interface AuthResult {
  uid: string;
  tier: Tier;
}

/**
 * A function that verifies a Firebase ID token and returns the uid.
 * Defaults to adminAuth().verifyIdToken — injectable for tests.
 */
export type TokenVerifier = (idToken: string) => Promise<{ uid: string }>;

export interface AuthHelperDeps {
  verifier?: TokenVerifier;
  gatingDeps?: GatingDeps;
}

// ---------------------------------------------------------------------------
// Default verifier (real Firebase Admin)
// ---------------------------------------------------------------------------

async function defaultVerifier(idToken: string): Promise<{ uid: string }> {
  const { adminAuth } = await import('@/lib/firebase-admin');
  return adminAuth().verifyIdToken(idToken);
}

// ---------------------------------------------------------------------------
// Main helper
// ---------------------------------------------------------------------------

/**
 * Authenticate the request and resolve the user's market tier.
 *
 * Returns an `AuthResult` on success, or a `NextResponse` with status 401
 * that the route handler should return directly.
 *
 * Usage in a route handler:
 *   const auth = await authenticate(request);
 *   if (auth instanceof NextResponse) return auth;
 *   const { uid, tier } = auth;
 */
export async function authenticate(
  request: Request,
  deps: AuthHelperDeps = {},
): Promise<AuthResult | NextResponse> {
  const verifier = deps.verifier ?? defaultVerifier;

  // Extract the Bearer token
  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Verify the token
  let uid: string;
  try {
    const decoded = await verifier(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Resolve tier
  const tier = await resolveTier(uid, deps.gatingDeps);

  return { uid, tier };
}
