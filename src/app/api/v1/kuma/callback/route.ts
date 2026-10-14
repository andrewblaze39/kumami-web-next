/**
 * POST /api/v1/kuma/callback?token=…  { userId, chatRoomId, aiResponse }
 * n8n → Kumami: saves Kuma's reply. Accepted only with the signed token issued
 * by /api/v1/kuma/chat for that exact user + chat room (15-min expiry).
 */
import { FieldValue } from 'firebase-admin/firestore';
import { fail, handler, ok, readJson } from '@/lib/api/v1';
import { adminDb } from '@/lib/firebase-admin';
import { verifyCallbackToken } from '@/lib/kuma/callbackToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = handler('kuma/callback', async (req: Request) => {
  const secret = process.env.KUMA_CALLBACK_SECRET ?? '';
  const body = await readJson(req);
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const chatRoomId = typeof body.chatRoomId === 'string' ? body.chatRoomId.trim() : '';
  const token = new URL(req.url).searchParams.get('token');
  if (!userId || !chatRoomId || !verifyCallbackToken(token, userId, chatRoomId, secret)) {
    return fail('unauthorized', 401, 'Invalid or expired callback token.');
  }
  const aiResponse = typeof body.aiResponse === 'string' ? body.aiResponse : body.aiResponse != null ? JSON.stringify(body.aiResponse) : '';
  if (!aiResponse.trim()) return fail('empty_response', 400);

  const userRef = adminDb().collection('users').doc(userId);
  // A reply that lands after the account was deleted must not recreate its chat data.
  if (!(await userRef.get()).exists) return fail('user_not_found', 404);
  const room = userRef.collection('chatrooms').doc(chatRoomId);
  const msg = await room.collection('messages').add({ role: 'assistant', message: aiResponse.slice(0, 20_000), timestamp: FieldValue.serverTimestamp() });
  await room.set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return ok({ success: true, messageId: msg.id, chatRoomId });
});
