import { Firestore, FieldValue } from 'firebase-admin/firestore';

export async function handleBrowseWhales(
  db: Firestore,
  userId: string,
  roomId: string,
  args: { page?: string }
) {
  const page = parseInt(args.page ?? '0', 10);
  const pageSize = 5;

  const snap = await db.collection('whales').where('enabled', '==', true).limit(pageSize + 1).offset(page * pageSize).get();
  const whales = snap.docs.slice(0, pageSize).map(d => d.data());
  const hasMore = snap.docs.length > pageSize;

  if (whales.length === 0) {
    const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
    await msgRef.set({
      id: msgRef.id,
      role: 'bot',
      message: 'No whale addresses found yet. Check back soon as we curate the list.',
      buttons: [],
      timestamp: FieldValue.serverTimestamp(),
    });
    return;
  }

  const lines = whales.map((w, i) => `**${i + 1 + page * pageSize}. ${w.label}**\n\`${w.address?.slice(0, 6)}...${w.address?.slice(-4)}\` · ${(w.chains ?? ['ETH']).join(', ')}\n${w.description ?? ''}`).join('\n\n');

  const buttons: { label: string; intentId: string; args: Record<string, string> }[] = whales.map(w => (
    { label: `Follow ${w.label}`, intentId: 'follow_whale', args: { address: w.address, label: w.label ?? '' } }
  ));
  if (hasMore) buttons.push({ label: '→ Next page', intentId: 'browse_whales', args: { page: String(page + 1) } });

  const msgRef = db.collection('users').doc(userId).collection('chatrooms').doc(roomId).collection('messages').doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: `🐋 **Curated Whale Wallets** (page ${page + 1}):\n\n${lines}`,
    buttons,
    buttonsUsed: false,
    timestamp: FieldValue.serverTimestamp(),
  });
}
