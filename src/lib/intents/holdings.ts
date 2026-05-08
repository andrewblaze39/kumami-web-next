import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { sdkForChain } from '../alchemy';
import { TokenBalanceType } from 'alchemy-sdk';

export async function handleHoldings(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { address: string }
) {
  const { address } = args;
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const followUpButtons = [
    { label: '👀 Watch', intentId: 'watch_wallet', args: { address } },
    { label: '📋 View Txs', intentId: 'view_wallet', args: { address } },
  ];

  try {
    const sdk = sdkForChain('eth');
    const result = await sdk.core.getTokenBalances(address, { type: TokenBalanceType.DEFAULT_TOKENS });

    const nonZero = (result.tokenBalances ?? []).filter(
      t => t.tokenBalance && t.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
    );

    if (nonZero.length === 0) {
      const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
      await msgRef.set({
        id: msgRef.id,
        role: 'bot',
        message: `No ERC-20 token holdings found for \`${shortAddr}\` on Ethereum.`,
        buttons: followUpButtons,
        buttonsUsed: false,
        timestamp: FieldValue.serverTimestamp(),
      });
      return;
    }

    const top10 = nonZero.slice(0, 10);
    const metadataResults = await Promise.allSettled(
      top10.map(t => sdk.core.getTokenMetadata(t.contractAddress))
    );

    const rows = top10.map((t, i) => {
      const meta = metadataResults[i].status === 'fulfilled' ? metadataResults[i].value : null;
      const symbol = meta?.symbol ?? t.contractAddress.slice(0, 8);
      const decimals = meta?.decimals ?? 18;
      const balance = (Number(BigInt(t.tokenBalance ?? '0x0')) / Math.pow(10, decimals)).toFixed(4);
      return { key: symbol, value: balance };
    });

    const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
    await msgRef.set({
      id: msgRef.id,
      role: 'bot',
      message: 'Top ERC-20 holdings on Ethereum:',
      card: {
        title: `${shortAddr} Holdings`,
        rows,
      },
      buttons: followUpButtons,
      buttonsUsed: false,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[holdings] error:', err);
    const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
    await msgRef.set({
      id: msgRef.id,
      role: 'bot',
      message: `Could not fetch holdings for \`${shortAddr}\`.`,
      buttons: followUpButtons,
      buttonsUsed: false,
      timestamp: FieldValue.serverTimestamp(),
    });
  }
}
