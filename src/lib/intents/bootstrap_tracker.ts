import { Firestore, FieldValue } from 'firebase-admin/firestore';

export async function bootstrapTrackerBot(db: Firestore, userId: string) {
  const roomRef = db.collection('users').doc(userId).collection('chatrooms').doc('tracker-bot');
  const messagesRef = roomRef.collection('messages');

  // Check if already bootstrapped
  const existing = await messagesRef.limit(1).get();
  if (!existing.empty) return;

  // Create greeting message
  const msgRef = messagesRef.doc();
  await msgRef.set({
    id: msgRef.id,
    role: 'bot',
    message: "👋 Hey! I'm **Tracker Bot**.\n\nI watch Ethereum wallets and alert you when they move — just like Telegram whale bots, but right here.\n\nWhat would you like to do?",
    buttons: [
      [
        { label: '➕ Add wallet', intentId: 'add_wallet', args: {} },
        { label: '🐋 Browse whales', intentId: 'browse_whales', args: {} },
      ],
    ],
    buttonsUsed: false,
    timestamp: FieldValue.serverTimestamp(),
  });
}
