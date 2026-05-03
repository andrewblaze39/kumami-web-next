import { Firestore } from 'firebase-admin/firestore';

export async function handleDismiss(
  db: Firestore,
  userId: string,
  _roomId: string,
  args: { msgId: string }
) {
  if (!args.msgId) return;
  await db.collection('users').doc(userId).collection('chatrooms').doc('tracker-bot').collection('messages').doc(args.msgId).update({ buttonsUsed: true });
}
