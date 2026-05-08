import { Firestore, FieldValue } from 'firebase-admin/firestore';

interface AlchemyActivity {
  fromAddress: string;
  toAddress: string;
  blockNum: string;
  hash: string;
  value?: number;
  asset?: string;
  category: string;
}

interface AlchemyPayload {
  event: {
    network: string;
    activity: AlchemyActivity[];
  };
}

function chainFromNetwork(network: string): string {
  if (network.includes('BASE')) return 'base';
  if (network.includes('ARB')) return 'arb';
  return 'eth';
}

export async function dispatchAlchemyActivity(db: Firestore, payload: AlchemyPayload) {
  const { network, activity } = payload.event;
  const chain = chainFromNetwork(network);

  for (const act of activity) {
    const addresses = [act.fromAddress?.toLowerCase(), act.toAddress?.toLowerCase()].filter(Boolean);

    for (const address of addresses) {
      // Find all users watching this address on this chain
      const snap = await db.collectionGroup('watchlist')
        .where('address', '==', address)
        .where('chains', 'array-contains', chain)
        .get();

      for (const watchDoc of snap.docs) {
        const watchData = watchDoc.data();
        const userId = watchDoc.ref.parent.parent!.id;

        // Check mute
        if (watchData.muteUntil && watchData.muteUntil.toDate() > new Date()) continue;

        // Check min USD threshold (basic: skip if value is tiny)
        const valueUsd = (act.value ?? 0) * 2000; // rough ETH price estimate
        if (valueUsd < (watchData.minUsd ?? 100) && act.category === 'external') continue;

        const direction = act.toAddress?.toLowerCase() === address ? 'IN' : 'OUT';
        const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
        const label = watchData.label || shortAddr;

        // Write alert message to tracker-bot chatroom
        const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc('tracker-bot').collection('messages').doc();
        await msgRef.set({
          id: msgRef.id,
          role: 'bot',
          message: `🚨 **Alert: ${label}**\n\n${direction === 'IN' ? '📥 Received' : '📤 Sent'} **${act.value?.toFixed(4) ?? '?'} ${act.asset ?? 'ETH'}** on ${chain.toUpperCase()}\n\nTx: \`${act.hash.slice(0, 10)}...\``,
          buttons: [
            { label: '🔗 View Tx', intentId: 'view_tx', args: { hash: act.hash, chain } },
            { label: '👛 View Wallet', intentId: 'view_wallet', args: { address } },
            { label: '🔇 Mute 1h', intentId: 'mute_1h', args: { address } },
            { label: '🔕 Unwatch', intentId: 'unwatch_wallet', args: { address } },
          ],
          buttonsUsed: false,
          timestamp: FieldValue.serverTimestamp(),
        });

        // Also write to alerts collection
        await db.collection('alerts').add({
          userId,
          watchlistId: watchDoc.id,
          chain,
          txHash: act.hash,
          direction,
          address,
          asset: act.asset,
          value: act.value,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
}
