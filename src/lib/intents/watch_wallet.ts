import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { registerAddressOnChain, type Chain } from '../alchemy';

export async function handleWatchWallet(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string; chains?: string }
) {
  const { address } = args;
  const normalizedAddress = address.toLowerCase();

  const chains: Chain[] = args.chains
    ? (args.chains.split(',').filter(c => ['eth', 'base', 'arb'].includes(c)) as Chain[])
    : ['eth', 'base', 'arb'];

  const writeBotMsg = async (message: string) => {
    const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
    await msgRef.set({ id: msgRef.id, role: 'bot', message, buttons: [], buttonsUsed: false, timestamp: FieldValue.serverTimestamp() });
  };

  if (chains.length === 0) {
    await writeBotMsg('⚠️ No valid chains selected. Choose at least one of ETH, Base, or Arb.');
    return;
  }

  const existingSnap = await db.collection('users').doc(userId).collection('watchlist').get();
  if (existingSnap.size >= 20) {
    await writeBotMsg('⚠️ You\'ve reached the 20 wallet limit. Unwatch an existing wallet before adding a new one.');
    return;
  }

  const watchRef = db.collection('users').doc(userId).collection('watchlist').doc();
  await watchRef.set({
    id: watchRef.id,
    address: normalizedAddress,
    chains,
    minUsd: 100,
    muteUntil: null,
    source: 'manual',
    label: `${address.slice(0, 6)}...${address.slice(-4)}`,
    createdAt: FieldValue.serverTimestamp(),
  });

  await registerAddressOnChain(normalizedAddress, chains);
}
