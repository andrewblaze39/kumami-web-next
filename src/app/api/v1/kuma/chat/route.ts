/**
 * POST /api/v1/kuma/chat  { message, chatRoomId?, source? } → 202 { chatRoomId }
 * Saves the user's message and starts the n8n "Kuma AI Agent" workflow; the
 * reply arrives later via /api/v1/kuma/callback and the client's Firestore
 * listener renders it. The user id comes from the token, never the body
 * (the old Firebase Function trusted a body `userId`). Spec v1.13 Pro §17.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { baseUrl, fail, handler, ok, rateLimited, readJson, requireUser } from '@/lib/api/v1';
import { adminDb } from '@/lib/firebase-admin';
import { signCallbackToken } from '@/lib/kuma/callbackToken';
import { sendToN8n } from '@/lib/kuma/n8n';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_N8N = 'https://n8n.srv1258054.hstgr.cloud/webhook/5e6bb706-b2c6-4024-91a7-33da36297030';
const ROOM_RE = /^[A-Za-z0-9_-]{1,128}$/;

export const POST = handler('kuma/chat', async (req: Request) => {
  const caller = await requireUser(req);
  if (!('uid' in caller)) return caller;
  const secret = process.env.KUMA_CALLBACK_SECRET;
  if (!secret) return fail('chat_not_configured', 503, 'Kuma chat is not configured on this server.');
  if (rateLimited(`kuma:${caller.uid}`, 20, 60_000)) return fail('rate_limited', 429, 'Slow down a little — try again in a minute.');

  const body = await readJson(req);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return fail('empty_message', 400, 'Message is empty.');
  if (message.length > 4000) return fail('message_too_long', 400, 'Message is too long (max 4000 characters).');
  const source = typeof body.source === 'string' ? body.source.slice(0, 40) : 'kumami-website';

  const db = adminDb();
  const userRef = db.collection('users').doc(caller.uid);
  let chatRoomId = typeof body.chatRoomId === 'string' && ROOM_RE.test(body.chatRoomId) ? body.chatRoomId : null;
  if (!chatRoomId) {
    const active = (await userRef.get()).get('activeChatRoomId');
    chatRoomId = typeof active === 'string' && ROOM_RE.test(active) ? active : `chat_${caller.uid}_${Date.now()}`;
    if (chatRoomId !== active) {
      await userRef.collection('chatrooms').doc(chatRoomId).set({ chatRoomId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      await userRef.set({ activeChatRoomId: chatRoomId }, { merge: true });
    }
  }

  await userRef.collection('chatrooms').doc(chatRoomId).collection('messages').add({
    role: 'user', message, timestamp: FieldValue.serverTimestamp(),
  });

  const token = signCallbackToken(caller.uid, chatRoomId, secret);
  const callbackUrl = `${baseUrl(req)}/api/v1/kuma/callback?token=${encodeURIComponent(token)}`;
  const method = process.env.N8N_CHAT_METHOD === 'POST' ? 'POST' : 'GET';
  try {
    const r = await sendToN8n(process.env.N8N_CHAT_WEBHOOK_URL || DEFAULT_N8N, method, {
      message, chatroomId: chatRoomId, source, userId: caller.uid, callbackUrl,
    });
    if (r.status >= 400) throw new Error(`n8n HTTP ${r.status}`);
  } catch (e) {
    console.error('[api/v1 kuma/chat] n8n', e);
    return fail('assistant_unavailable', 502, 'Kuma AI is unavailable right now. Please try again.');
  }
  return ok({ chatRoomId }, 202);
});
