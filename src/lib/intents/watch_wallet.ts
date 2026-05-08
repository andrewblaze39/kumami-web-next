import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { registerAddressOnChain, type Chain } from '../alchemy';

export async function handleWatchWallet(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string; chains?: string; msgId?: string }
) {
  const { address } = args;
  const chains: Chain[] = ['eth', 'base', 'arb'];

  // Write to watchlist
  const watchRef = db.collection('users').doc(userId).collection('watchlist').doc();
  await watchRef.set({
    id: watchRef.id,
    address,
    chains,
    minUsd: 100,
    muteUntil: null,
    source: 'manual',
    label: `${address.slice(0, 6)}...${address.slice(-4)}`,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Register with Alchemy Notify
  await registerAddressOnChain(address, chains);

  // Confirm message
  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: `✅ Now watching \`${address.slice(0, 6)}...${address.slice(-4)}\` on ETH, Base, and Arb.\n\nYou'll get alerts here for transactions above **$100**. Use the buttons below to adjust.`,
    buttons: [
      { label: '🎚️ Change threshold', intentId: 'set_threshold', args: { address } },
      { label: '🔕 Unwatch', intentId: 'unwatch_wallet', args: { address } },
    ],
    buttonsUsed: false,
    timestamp: FieldValue.serverTimestamp(),
  });
}
