import { Firestore, FieldValue } from 'firebase-admin/firestore';

export async function handleSetThreshold(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string; value?: string }
) {
  const { address, value } = args;
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (value) {
    const minUsd = parseInt(value, 10);
    const snap = await db.collection('users').doc(userId).collection('watchlist')
      .where('address', '==', address).limit(1).get();

    if (!snap.empty) {
      await snap.docs[0].ref.update({ minUsd });
    }

    const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
    await msgRef.set({
      id: msgRef.id,
      role: 'bot',
      message: `✅ Alert threshold for \`${shortAddr}\` set to **$${minUsd.toLocaleString()}**.`,
      buttons: [
        { label: '🎚️ Change threshold', intentId: 'set_threshold', args: { address } },
        { label: '🔕 Unwatch', intentId: 'unwatch_wallet', args: { address } },
      ],
      buttonsUsed: false,
      timestamp: FieldValue.serverTimestamp(),
    });
  } else {
    // Show threshold picker
    const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
    await msgRef.set({
      id: msgRef.id,
      role: 'bot',
      message: `Select a minimum USD threshold for alerts on \`${shortAddr}\`:`,
      buttons: [
        { label: '$50', intentId: 'set_threshold', args: { address, value: '50' } },
        { label: '$100', intentId: 'set_threshold', args: { address, value: '100' } },
        { label: '$500', intentId: 'set_threshold', args: { address, value: '500' } },
        { label: '$1,000', intentId: 'set_threshold', args: { address, value: '1000' } },
        { label: '$5,000', intentId: 'set_threshold', args: { address, value: '5000' } },
      ],
      buttonsUsed: false,
      timestamp: FieldValue.serverTimestamp(),
    });
  }
}
