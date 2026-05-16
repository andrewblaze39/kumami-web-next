import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { registerAddressOnChain, unregisterAddressOnChain, type Chain } from '../alchemy';

const ALL_CHAINS: Chain[] = ['eth', 'base', 'arb'];

export async function handleUpdateChains(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string; chains?: string }
) {
  const { address } = args;
  const normalizedAddress = address.toLowerCase();
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const newChains = (args.chains ?? '')
    .split(',')
    .filter(c => ALL_CHAINS.includes(c as Chain)) as Chain[];

  const writeBotMsg = async (message: string) => {
    const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
    await msgRef.set({ id: msgRef.id, role: 'bot', message, buttons: [], buttonsUsed: false, timestamp: FieldValue.serverTimestamp() });
  };

  if (newChains.length === 0) {
    await writeBotMsg(`⚠️ No valid chains selected for \`${shortAddr}\`. Choose at least one of ETH, Base, or Arb.`);
    return;
  }

  const snap = await db.collection('users').doc(userId).collection('watchlist')
    .where('address', '==', normalizedAddress).limit(1).get();

  if (snap.empty) {
    await writeBotMsg(`⚠️ Wallet \`${shortAddr}\` is not in your watchlist.`);
    return;
  }

  const doc = snap.docs[0];
  const oldChains: Chain[] = doc.data().chains ?? ALL_CHAINS;

  await doc.ref.update({ chains: newChains });

  const added = newChains.filter(c => !oldChains.includes(c));
  const removed = oldChains.filter(c => !newChains.includes(c));

  await Promise.all([
    added.length > 0 ? registerAddressOnChain(normalizedAddress, added) : Promise.resolve(),
    removed.length > 0 ? unregisterAddressOnChain(normalizedAddress, removed) : Promise.resolve(),
  ]);

  await writeBotMsg(`✅ Updated chain subscriptions for \`${shortAddr}\`: now watching ${newChains.map(c => c.toUpperCase()).join(', ')}.`);
}
