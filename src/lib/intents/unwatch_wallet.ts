import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { unregisterAddressOnChain, type Chain } from '../alchemy';

export async function handleUnwatchWallet(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string }
) {
  const { address } = args;
  const watchlistRef = db.collection('users').doc(userId).collection('watchlist');
  const snap = await watchlistRef.where('address', '==', address).get();

  const chains: Chain[] = ['eth', 'base', 'arb'];
  await Promise.all(snap.docs.map(d => d.ref.delete()));
  await unregisterAddressOnChain(address, chains);

  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: `🔕 Stopped watching \`${address.slice(0, 6)}...${address.slice(-4)}\`. You won't receive alerts for this wallet anymore.`,
    buttons: [],
    timestamp: FieldValue.serverTimestamp(),
  });
}
