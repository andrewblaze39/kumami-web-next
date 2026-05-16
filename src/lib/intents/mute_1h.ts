import { Firestore, FieldValue } from 'firebase-admin/firestore';

const DURATION_MINUTES: Record<string, number> = {
  '1h': 60,
  '4h': 240,
  '24h': 1440,
};

export async function handleMute1h(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string; duration?: string }
) {
  const { address } = args;
  const minutes = DURATION_MINUTES[args.duration ?? '1h'] ?? 60;
  const muteUntil = new Date(Date.now() + minutes * 60 * 1000);
  const label = args.duration ?? '1h';

  const watchlistRef = db.collection('users').doc(userId).collection('watchlist');
  const snap = await watchlistRef.where('address', '==', address.toLowerCase()).get();
  await Promise.all(snap.docs.map(d => d.ref.update({ muteUntil })));

  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: `🔇 Muted \`${address.slice(0, 6)}...${address.slice(-4)}\` for ${label}. Alerts resume at ${muteUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    buttons: [],
    buttonsUsed: false,
    timestamp: FieldValue.serverTimestamp(),
  });
}
