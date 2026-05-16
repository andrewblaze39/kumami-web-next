import { Firestore, FieldValue } from 'firebase-admin/firestore';

export async function handleSetThreshold(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string; value: string }
) {
  const { address, value } = args;
  const parsed = parseInt(value, 10);
  const minUsd = isNaN(parsed) ? 100 : Math.max(0, parsed);
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const snap = await db.collection('users').doc(userId).collection('watchlist')
    .where('address', '==', address.toLowerCase()).limit(1).get();

  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();

  if (snap.empty) {
    await msgRef.set({
      id: msgRef.id, role: 'bot',
      message: `⚠️ Wallet \`${shortAddr}\` is not in your watchlist.`,
      buttons: [], buttonsUsed: false, timestamp: FieldValue.serverTimestamp(),
    });
    return;
  }

  await snap.docs[0].ref.update({ minUsd });

  await msgRef.set({
    id: msgRef.id, role: 'bot',
    message: `✅ Threshold for \`${shortAddr}\` set to **$${minUsd.toLocaleString()}**.`,
    buttons: [], buttonsUsed: false, timestamp: FieldValue.serverTimestamp(),
  });
}
