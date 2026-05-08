import { Firestore, FieldValue } from 'firebase-admin/firestore';

export async function handleMute1h(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string }
) {
  const { address } = args;
  const muteUntil = new Date(Date.now() + 60 * 60 * 1000);

  const watchlistRef = db.collection('users').doc(userId).collection('watchlist');
  const snap = await watchlistRef.where('address', '==', address).get();
  await Promise.all(snap.docs.map(d => d.ref.update({ muteUntil })));

  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: `🔇 Muted alerts for \`${address.slice(0, 6)}...${address.slice(-4)}\` for 1 hour. Alerts resume at ${muteUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    buttons: [
      { label: '🔕 Unwatch', intentId: 'unwatch_wallet', args: { address } },
    ],
    buttonsUsed: false,
    timestamp: FieldValue.serverTimestamp(),
  });
}
