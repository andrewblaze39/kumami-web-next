import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { handleAddWallet } from '@/lib/intents/add_wallet';
import { handleWatchWallet } from '@/lib/intents/watch_wallet';
import { handleUnwatchWallet } from '@/lib/intents/unwatch_wallet';
import { handleMute1h } from '@/lib/intents/mute_1h';
import { handleBrowseWhales } from '@/lib/intents/browse_whales';
import { handleFollowWhale } from '@/lib/intents/follow_whale';
import { handleViewWallet } from '@/lib/intents/view_wallet';
import { handleDismiss } from '@/lib/intents/dismiss';

export async function POST(req: NextRequest) {
  // Verify Firebase ID token
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.replace('Bearer ', '').trim();

  let userId: string;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { intentId, args = {}, roomId = 'tracker-bot' } = body;

  const db = adminDb();

  try {
    switch (intentId) {
      case 'add_wallet':
        await handleAddWallet(db, userId, roomId, args);
        break;
      case 'watch_wallet':
        await handleWatchWallet(db, userId, roomId, args);
        break;
      case 'unwatch_wallet':
        await handleUnwatchWallet(db, userId, roomId, args);
        break;
      case 'mute_1h':
        await handleMute1h(db, userId, roomId, args);
        break;
      case 'browse_whales':
        await handleBrowseWhales(db, userId, roomId, args);
        break;
      case 'follow_whale':
        await handleFollowWhale(db, userId, roomId, args);
        break;
      case 'view_wallet':
        await handleViewWallet(db, userId, roomId, args);
        break;
      case 'dismiss':
        await handleDismiss(db, userId, roomId, args);
        break;
      default:
        return NextResponse.json({ error: `Unknown intent: ${intentId}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Intent error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
