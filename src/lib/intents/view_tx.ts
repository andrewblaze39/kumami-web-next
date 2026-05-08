import { Firestore, FieldValue } from 'firebase-admin/firestore';

const EXPLORER: Record<string, string> = {
  eth: 'https://etherscan.io/tx',
  base: 'https://basescan.org/tx',
  arb: 'https://arbiscan.io/tx',
};

export async function handleViewTx(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { hash: string; chain: string }
) {
  const { hash, chain } = args;
  const explorerBase = EXPLORER[chain] ?? EXPLORER.eth;
  const explorerName = chain === 'base' ? 'Basescan' : chain === 'arb' ? 'Arbiscan' : 'Etherscan';

  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: `🔗 **Transaction on ${chain.toUpperCase()}**`,
    card: {
      title: `${hash.slice(0, 10)}...${hash.slice(-6)}`,
      rows: [
        { key: 'Chain', value: chain.toUpperCase() },
        { key: 'Explorer', value: explorerName },
        { key: 'URL', value: `${explorerBase}/${hash}` },
      ],
    },
    buttons: [],
    buttonsUsed: false,
    timestamp: FieldValue.serverTimestamp(),
  });
}
