/**
 * Signed one-chat-room token for the n8n → Kumami reply callback (spec v1.13
 * Pro §17). n8n calls back whatever `callbackUrl` we send it, so the token rides
 * in that URL: it authorises writing replies for ONE user + chat room, for a
 * limited time — n8n needs no secret of its own. HMAC-SHA256, KUMA_CALLBACK_SECRET.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_MS = 15 * 60_000;

export function signCallbackToken(uid: string, chatRoomId: string, secret: string, nowMs = Date.now()): string {
  const exp = nowMs + TTL_MS;
  return `${exp}.${mac(uid, chatRoomId, exp, secret)}`;
}

export function verifyCallbackToken(token: string | null, uid: string, chatRoomId: string, secret: string, nowMs = Date.now()): boolean {
  if (!token || !secret) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < nowMs || !sig) return false;
  const want = Buffer.from(mac(uid, chatRoomId, exp, secret));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

function mac(uid: string, room: string, exp: number, secret: string): string {
  return createHmac('sha256', secret).update(`${uid}\n${room}\n${exp}`).digest('base64url');
}
