/**
 * Referral codes (spec v1.13 Pro §22): 8 characters from an alphabet with no
 * look-alikes (no 0/O, 1/I/L), generated server-side with a crypto RNG and
 * reserved in a transaction, so two users can never share a code.
 */
import type { Store } from './store';

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;
const MAX_ATTEMPTS = 5;

/** `rand(n)` returns an integer in [0, n). Inject for tests; production uses crypto.randomInt. */
export function generateCode(rand: (n: number) => number): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
  return code;
}

/** Normalise user input ("ab cd-23xy" → "ABCD23XY"); null if it can't be a code. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const c = input.toUpperCase().replace(/[\s-]/g, '');
  if (c.length !== CODE_LENGTH) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}

export type EnsureCodeResult = { ok: true; code: string; created: boolean } | { ok: false; reason: 'user_not_found' | 'exhausted' };

/** Return the user's code, creating one if they have none. Safe to call concurrently. */
export async function ensureReferralCode(
  store: Store,
  uid: string,
  rand: (n: number) => number,
  now: Date,
): Promise<EnsureCodeResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateCode(rand);
    const r = await store.runTransaction(async (tx) => {
      const user = await tx.get(`users/${uid}`);
      if (!user) return { ok: false as const, reason: 'user_not_found' as const };
      if (typeof user.referralCode === 'string' && user.referralCode) {
        return { ok: true as const, code: user.referralCode, created: false };
      }
      if (await tx.get(`referralCodes/${candidate}`)) return null; // taken — try another
      tx.set(`referralCodes/${candidate}`, { code: candidate, userId: uid, createdAt: now });
      tx.set(`users/${uid}`, { referralCode: candidate }, { merge: true });
      return { ok: true as const, code: candidate, created: true };
    });
    if (r) return r;
  }
  return { ok: false, reason: 'exhausted' };
}

export type CodeCheck = { valid: true; ownerUid: string } | { valid: false; reason: 'not_found' | 'own_code' | 'malformed' };

export async function checkCode(store: Store, input: unknown, callerUid: string | null): Promise<CodeCheck> {
  const code = normalizeCode(input);
  if (!code) return { valid: false, reason: 'malformed' };
  const doc = await store.get(`referralCodes/${code}`);
  const owner = typeof doc?.userId === 'string' ? doc.userId : null;
  if (!owner) return { valid: false, reason: 'not_found' };
  if (callerUid && owner === callerUid) return { valid: false, reason: 'own_code' };
  return { valid: true, ownerUid: owner };
}
