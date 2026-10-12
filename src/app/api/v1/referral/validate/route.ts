/**
 * GET /api/v1/referral/validate?code=XXXXXXXX → { valid, reason }
 * reason: null | 'not_found' | 'own_code' | 'malformed'. Auth optional (needed to
 * detect "own code"). Rate-limited per IP so codes can't be brute-forced.
 */
import { clientIp, fail, handler, ok, optionalUser, rateLimited } from '@/lib/api/v1';
import { firestoreStore } from '@/lib/billing/firestoreStore';
import { checkCode } from '@/lib/billing/referralCode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler('referral/validate', async (req: Request) => {
  if (rateLimited(`refval:${clientIp(req)}`, 30, 60_000)) return fail('rate_limited', 429, 'Too many attempts — wait a minute.');
  const caller = await optionalUser(req);
  const code = new URL(req.url).searchParams.get('code');
  const r = await checkCode(firestoreStore(), code, caller?.uid ?? null);
  return ok(r.valid ? { valid: true, reason: null } : { valid: false, reason: r.reason });
});
