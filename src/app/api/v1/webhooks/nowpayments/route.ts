/**
 * POST /api/v1/webhooks/nowpayments — NOWPayments IPN. Rejects (401) unless the
 * x-nowpayments-sig HMAC-SHA512 over the key-sorted body matches
 * NOWPAYMENTS_IPN_SECRET. Only "finished" with the full order amount grants Pro.
 */
import { fail, ok } from '@/lib/api/v1';
import { firestoreStore } from '@/lib/billing/firestoreStore';
import { handleIpn, verifyIpn } from '@/lib/billing/nowpayments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) {
    console.error('[webhooks/nowpayments] NOWPAYMENTS_IPN_SECRET missing');
    return fail('billing_not_configured', 503);
  }
  const raw = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('bad_request', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !verifyIpn(body, req.headers.get('x-nowpayments-sig'), secret)) {
    return fail('bad_signature', 401);
  }
  try {
    const r = await handleIpn(body as Record<string, unknown>, { store: firestoreStore(), now: () => new Date() });
    console.info(`[webhooks/nowpayments] ${(body as Record<string, unknown>).payment_status} → ${r.status} (${r.detail})`);
    return ok({ received: true, ...r });
  } catch (e) {
    console.error('[webhooks/nowpayments] failed', e);
    return fail('processing_failed', 500);
  }
}
