import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { registerAddressOnChain, type Chain } from '../alchemy';

export async function handleWatchWallet(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string; chains?: string }
) {
  const { address } = args;
  const chains: Chain[] = args.chains
    ? (args.chains.split(',').filter(c => ['eth', 'base', 'arb'].includes(c)) as Chain[])
    : ['eth', 'base', 'arb'];

  const existingSnap = await db.collection('users').doc(userId).collection('watchlist').get();
  if (existingSnap.size >= 20) return;

  const watchRef = db.collection('users').doc(userId).collection('watchlist').doc();
  await watchRef.set({
    id: watchRef.id,
    address: address.toLowerCase(),
    chains,
    minUsd: 100,
    muteUntil: null,
    source: 'manual',
    label: `${address.slice(0, 6)}...${address.slice(-4)}`,
    createdAt: FieldValue.serverTimestamp(),
  });

  await registerAddressOnChain(address, chains);
}
