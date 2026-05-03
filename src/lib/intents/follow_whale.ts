import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { registerAddressOnChain, type Chain } from '../alchemy';

export async function handleFollowWhale(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string; label?: string }
) {
  const { address, label } = args;
  const chains: Chain[] = ['eth', 'base', 'arb'];

  const watchRef = db.collection('users').doc(userId).collection('watchlist').doc();
  await watchRef.set({
    id: watchRef.id,
    address,
    chains,
    minUsd: 100,
    muteUntil: null,
    source: 'whale',
    label: label || `${address.slice(0, 6)}...${address.slice(-4)}`,
    createdAt: FieldValue.serverTimestamp(),
  });

  await registerAddressOnChain(address, chains);

  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: `✅ Now following **${label || address.slice(0, 10) + '...'}**. You'll get alerts when this wallet moves above $100.`,
    buttons: [[
      { label: '🔕 Unfollow', intentId: 'unwatch_wallet', args: { address } },
    ]],
    buttonsUsed: false,
    timestamp: FieldValue.serverTimestamp(),
  });
}
