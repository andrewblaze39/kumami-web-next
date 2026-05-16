import { Firestore } from 'firebase-admin/firestore';
import { registerAddressOnChain, unregisterAddressOnChain, type Chain } from '../alchemy';

const ALL_CHAINS: Chain[] = ['eth', 'base', 'arb'];

export async function handleUpdateChains(
  db: Firestore,
  userId: string,
  _roomId: string,
  args: { address: string; chains: string }
) {
  const { address } = args;
  const newChains = args.chains
    .split(',')
    .filter(c => ALL_CHAINS.includes(c as Chain)) as Chain[];

  if (newChains.length === 0) return; // refuse to watch on zero chains

  const snap = await db.collection('users').doc(userId).collection('watchlist')
    .where('address', '==', address.toLowerCase()).limit(1).get();

  if (snap.empty) return;

  const doc = snap.docs[0];
  const oldChains: Chain[] = doc.data().chains ?? ALL_CHAINS;

  await doc.ref.update({ chains: newChains });

  const added = newChains.filter(c => !oldChains.includes(c));
  const removed = oldChains.filter(c => !newChains.includes(c));

  await Promise.all([
    added.length > 0 ? registerAddressOnChain(address, added) : Promise.resolve(),
    removed.length > 0 ? unregisterAddressOnChain(address, removed) : Promise.resolve(),
  ]);
}
