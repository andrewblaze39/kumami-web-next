import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { getWalletSummary } from '../alchemy';

export async function handleAddWallet(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string }
) {
  const { address } = args;
  const summary = await getWalletSummary(address, ['eth']);
  const ethChain = summary[0];

  const card = ethChain ? {
    title: `${address.slice(0, 6)}...${address.slice(-4)}`,
    rows: [
      { key: 'ETH Balance', value: ethChain.ethBalance },
      { key: 'NFTs', value: String(ethChain.nftCount) },
      { key: 'Recent Txs', value: `${ethChain.recentTxCount} (last 10)` },
    ],
  } : null;

  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: card ? 'Here\'s a summary of this wallet:' : `Could not fetch data for \`${address}\`. It may be invalid.`,
    ...(card ? { card } : {}),
    buttons: card ? [
      { label: '👀 Watch', intentId: 'watch_wallet', args: { address } },
      { label: '📋 View Txs', intentId: 'view_wallet', args: { address } },
      { label: '💰 Holdings', intentId: 'holdings', args: { address } },
      { label: '✕ Cancel', intentId: 'dismiss', args: { msgId: msgRef.id } },
    ] : [],
    buttonsUsed: false,
    timestamp: FieldValue.serverTimestamp(),
  });
}
