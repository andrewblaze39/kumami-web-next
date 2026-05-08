import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { getWalletSummary } from '../alchemy';

export async function handleViewWallet(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string }
) {
  const { address } = args;
  const summary = await getWalletSummary(address, ['eth', 'base', 'arb']);

  const rows = summary.flatMap(s => [
    { key: `[${s.chain.toUpperCase()}] Balance`, value: s.ethBalance },
    { key: `[${s.chain.toUpperCase()}] NFTs`, value: String(s.nftCount) },
    { key: `[${s.chain.toUpperCase()}] Recent Txs`, value: String(s.recentTxCount) },
  ]);

  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: 'Wallet summary across all chains:',
    card: {
      title: `${address.slice(0, 6)}...${address.slice(-4)}`,
      rows,
    },
    buttons: [
      { label: '👀 Watch', intentId: 'watch_wallet', args: { address } },
    ],
    buttonsUsed: false,
    timestamp: FieldValue.serverTimestamp(),
  });
}
